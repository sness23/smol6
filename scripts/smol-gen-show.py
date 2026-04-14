#!/usr/bin/env python3
"""
smol-gen-show — generate a .show file for a protein-ligand complex from a PDB id.

Given a PDB id (and optionally a ligand resname), this tool:
  1. Fetches the structure from RCSB
  2. Parses it with Biopython
  3. Auto-detects the "interesting" ligand (largest non-water, non-ion HET)
  4. Computes all non-covalent interactions between the ligand and the target:
     H-bond-like contacts, salt-bridge candidates, π-stacking, close contacts
  5. Sends the structured interaction list to OpenAI (o3) for narration
  6. Writes a smol-present-compatible .show file

Usage:
    smol-gen-show.py <pdbid> [ligand_resname] [-o out.show] [--model o3]

Env:
    OPENAI_API_KEY    required for narration
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import urllib.request
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Constants — interaction geometry
# ---------------------------------------------------------------------------

CONTACT_CUTOFF = 4.0        # Å, heavy-atom contact
HBOND_CUTOFF = 3.5          # Å, donor-acceptor heavy-atom (no angle check — PDBs often lack Hs)
SALT_BRIDGE_CUTOFF = 5.0    # Å, charged-charged heavy-atom
PI_STACKING_CUTOFF = 5.5    # Å, centroid-centroid

# Atoms that can act as H-bond donors or acceptors (heavy-atom, Hs absent)
HBOND_ELEMENTS = {"N", "O", "F", "S"}

# Charged residues
POS_RES = {"LYS", "ARG", "HIS"}
NEG_RES = {"ASP", "GLU"}
POS_ATOMS = {  # sidechain atoms carrying + charge
    "LYS": {"NZ"},
    "ARG": {"NH1", "NH2", "NE"},
    "HIS": {"ND1", "NE2"},
}
NEG_ATOMS = {
    "ASP": {"OD1", "OD2"},
    "GLU": {"OE1", "OE2"},
}

# Aromatic residue rings (atoms forming the ring)
AROMATIC_RINGS = {
    "PHE": ["CG", "CD1", "CD2", "CE1", "CE2", "CZ"],
    "TYR": ["CG", "CD1", "CD2", "CE1", "CE2", "CZ"],
    "TRP": ["CG", "CD1", "CD2", "NE1", "CE2", "CE3", "CZ2", "CZ3", "CH2"],
    "HIS": ["CG", "ND1", "CD2", "CE1", "NE2"],
}

STANDARD_AA = {
    "ALA", "ARG", "ASN", "ASP", "CYS", "GLU", "GLN", "GLY", "HIS", "ILE",
    "LEU", "LYS", "MET", "PHE", "PRO", "SER", "THR", "TRP", "TYR", "VAL",
}
SKIP_HET = {"HOH", "WAT", "DOD", "D2O"}  # water
SKIP_IONS = {
    "NA", "K", "MG", "CA", "ZN", "FE", "CU", "MN", "CL", "BR", "I", "F",
    "SO4", "PO4", "CL ", "NAG", "GOL", "EDO", "PEG", "MES", "TRS", "HEP",
    "IMD", "DMS", "ACT", "FMT", "CIT", "EPE", "BME",  # common buffers/cryos
}

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class Interaction:
    kind: str                  # "hbond" | "salt_bridge" | "pi_stacking" | "contact"
    distance: float
    protein_chain: str
    protein_resname: str
    protein_resnum: int
    protein_atom: str
    ligand_atom: str
    # pi_stacking uses centroid atoms list; ligand_atom stores "ring"

    def protein_label(self) -> str:
        return f"{self.protein_resname}{self.protein_resnum}"

    def sel(self) -> str:
        """Return smol ChimeraX-style selection for the protein residue."""
        return f"/{self.protein_chain}:{self.protein_resnum}"


@dataclass
class LigandInfo:
    resname: str
    chain: str
    resnum: int
    atom_count: int
    formula: dict = field(default_factory=dict)

    def sel(self) -> str:
        return f":{self.resname}"


@dataclass
class AnalysisResult:
    pdbid: str
    title: str
    ligand: LigandInfo
    interactions: list[Interaction]

    def residues_touched(self) -> list[tuple[str, str, int]]:
        seen: dict[tuple[str, str, int], None] = {}
        for i in self.interactions:
            seen[(i.protein_chain, i.protein_resname, i.protein_resnum)] = None
        return list(seen.keys())


# ---------------------------------------------------------------------------
# Structure fetch + analysis
# ---------------------------------------------------------------------------


def fetch_pdb(pdbid: str, cache_dir: Path) -> Path:
    pdbid = pdbid.lower()
    cache_dir.mkdir(parents=True, exist_ok=True)
    dest = cache_dir / f"{pdbid}.pdb"
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    url = f"https://files.rcsb.org/download/{pdbid}.pdb"
    print(f"[fetch] {url}", file=sys.stderr)
    urllib.request.urlretrieve(url, dest)
    return dest


def parse_title(pdb_path: Path) -> str:
    title_lines: list[str] = []
    with pdb_path.open() as f:
        for line in f:
            if line.startswith("TITLE"):
                title_lines.append(line[10:].strip())
            elif line.startswith("ATOM") or line.startswith("HETATM"):
                break
    return " ".join(t for t in title_lines if t).strip()


def pick_ligand(structure, explicit: Optional[str]) -> LigandInfo:
    """Choose the ligand of interest. If explicit given, use that resname.
    Otherwise pick the largest non-water, non-ion HET residue in the first model."""
    model = next(iter(structure))
    candidates: list[LigandInfo] = []
    for chain in model:
        for residue in chain:
            hetflag = residue.id[0].strip()
            if not hetflag or hetflag == " ":
                continue
            resname = residue.get_resname().strip()
            if resname in STANDARD_AA or resname in SKIP_HET:
                continue
            atom_count = sum(1 for _ in residue.get_atoms())
            candidates.append(LigandInfo(
                resname=resname,
                chain=chain.id,
                resnum=residue.id[1],
                atom_count=atom_count,
            ))

    if not candidates:
        raise SystemExit("No HET ligands found in structure.")

    if explicit:
        explicit = explicit.upper()
        match = [c for c in candidates if c.resname == explicit]
        if not match:
            resnames = ", ".join(sorted({c.resname for c in candidates}))
            raise SystemExit(f"Ligand '{explicit}' not found. Available: {resnames}")
        return max(match, key=lambda c: c.atom_count)

    # Auto-pick: filter out common ions/buffers, then take the largest by atom count.
    filtered = [c for c in candidates if c.resname not in SKIP_IONS and c.atom_count >= 5]
    pool = filtered or candidates
    return max(pool, key=lambda c: c.atom_count)


def distance(a, b) -> float:
    dx = a.coord[0] - b.coord[0]
    dy = a.coord[1] - b.coord[1]
    dz = a.coord[2] - b.coord[2]
    return math.sqrt(dx * dx + dy * dy + dz * dz)


def centroid(atoms) -> tuple[float, float, float]:
    xs = [a.coord[0] for a in atoms]
    ys = [a.coord[1] for a in atoms]
    zs = [a.coord[2] for a in atoms]
    n = len(atoms)
    return (sum(xs) / n, sum(ys) / n, sum(zs) / n)


def centroid_distance(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    dx, dy, dz = a[0] - b[0], a[1] - b[1], a[2] - b[2]
    return math.sqrt(dx * dx + dy * dy + dz * dz)


def element_of(atom) -> str:
    e = (atom.element or "").strip().upper()
    if e:
        return e
    # fallback: first alpha char of atom name
    name = atom.get_name()
    return name[0].upper() if name else ""


def analyze(pdbid: str, pdb_path: Path, explicit_resname: Optional[str]) -> AnalysisResult:
    try:
        from Bio.PDB import PDBParser
    except ImportError as exc:
        raise SystemExit("Biopython is required. pip install biopython") from exc

    parser = PDBParser(QUIET=True)
    structure = parser.get_structure(pdbid, pdb_path)
    title = parse_title(pdb_path) or pdbid.upper()
    ligand = pick_ligand(structure, explicit_resname)
    print(f"[ligand] {ligand.resname} (chain {ligand.chain}, resnum {ligand.resnum}, {ligand.atom_count} atoms)",
          file=sys.stderr)

    model = next(iter(structure))
    # Collect ligand atoms
    lig_residue = None
    for chain in model:
        if chain.id != ligand.chain:
            continue
        for residue in chain:
            if residue.get_resname().strip() == ligand.resname and residue.id[1] == ligand.resnum:
                lig_residue = residue
                break
    if lig_residue is None:
        raise SystemExit("Selected ligand vanished after lookup — bug.")

    ligand_atoms = [a for a in lig_residue.get_atoms() if element_of(a) != "H"]

    # Collect ligand ring(s) for π-stacking. Simplified: treat any planar set of
    # 5–6 carbons as a ring candidate. Too heavy to implement properly here — we
    # leave ligand π-stacking heuristic to "ligand has aromatic atoms if RDKit
    # available"; for now approximate by using ligand centroid if the ligand has
    # ≥5 carbons in close proximity to an aromatic residue ring.
    lig_c_atoms = [a for a in ligand_atoms if element_of(a) == "C"]
    lig_centroid = centroid(ligand_atoms) if ligand_atoms else None

    interactions: list[Interaction] = []

    # Gather protein residues (skip waters, non-standard entries, and the ligand itself)
    for chain in model:
        for residue in chain:
            hetflag = residue.id[0].strip()
            resname = residue.get_resname().strip()
            if hetflag and hetflag != "W" and resname not in STANDARD_AA:
                # skip other HET groups (ions, cofactors) for now
                continue
            if resname not in STANDARD_AA:
                continue  # waters, ions
            if chain.id == ligand.chain and residue.id[1] == ligand.resnum:
                continue  # don't match ligand to itself

            prot_atoms = [a for a in residue.get_atoms() if element_of(a) != "H"]

            # Heavy-atom contacts and H-bond candidates
            for p_atom in prot_atoms:
                for l_atom in ligand_atoms:
                    d = distance(p_atom, l_atom)
                    if d > CONTACT_CUTOFF:
                        continue
                    pe = element_of(p_atom)
                    le = element_of(l_atom)
                    if d <= HBOND_CUTOFF and pe in HBOND_ELEMENTS and le in HBOND_ELEMENTS:
                        interactions.append(Interaction(
                            kind="hbond",
                            distance=round(d, 2),
                            protein_chain=chain.id,
                            protein_resname=resname,
                            protein_resnum=residue.id[1],
                            protein_atom=p_atom.get_name(),
                            ligand_atom=l_atom.get_name(),
                        ))
                    else:
                        interactions.append(Interaction(
                            kind="contact",
                            distance=round(d, 2),
                            protein_chain=chain.id,
                            protein_resname=resname,
                            protein_resnum=residue.id[1],
                            protein_atom=p_atom.get_name(),
                            ligand_atom=l_atom.get_name(),
                        ))

            # Salt bridges: charged protein atoms vs. any N/O ligand atom within cutoff
            if resname in POS_RES:
                charged = [a for a in prot_atoms if a.get_name() in POS_ATOMS.get(resname, set())]
                lig_neg = [a for a in ligand_atoms if element_of(a) in {"O"}]
                for p in charged:
                    for l in lig_neg:
                        d = distance(p, l)
                        if d <= SALT_BRIDGE_CUTOFF:
                            interactions.append(Interaction(
                                kind="salt_bridge",
                                distance=round(d, 2),
                                protein_chain=chain.id,
                                protein_resname=resname,
                                protein_resnum=residue.id[1],
                                protein_atom=p.get_name(),
                                ligand_atom=l.get_name(),
                            ))
            if resname in NEG_RES:
                charged = [a for a in prot_atoms if a.get_name() in NEG_ATOMS.get(resname, set())]
                lig_pos = [a for a in ligand_atoms if element_of(a) == "N"]
                for p in charged:
                    for l in lig_pos:
                        d = distance(p, l)
                        if d <= SALT_BRIDGE_CUTOFF:
                            interactions.append(Interaction(
                                kind="salt_bridge",
                                distance=round(d, 2),
                                protein_chain=chain.id,
                                protein_resname=resname,
                                protein_resnum=residue.id[1],
                                protein_atom=p.get_name(),
                                ligand_atom=l.get_name(),
                            ))

            # π-stacking: aromatic residue ring centroid vs. ligand centroid.
            # Approximate — requires ≥5 ligand carbons nearby. A proper check
            # needs ligand ring perception (RDKit); we use a crude distance-only rule.
            if resname in AROMATIC_RINGS and lig_centroid is not None and len(lig_c_atoms) >= 5:
                ring_atom_names = AROMATIC_RINGS[resname]
                ring_atoms = [a for a in prot_atoms if a.get_name() in ring_atom_names]
                if len(ring_atoms) >= 4:
                    rc = centroid(ring_atoms)
                    # Count nearby ligand carbons
                    near_c = [a for a in lig_c_atoms if centroid_distance(a.coord, rc) <= PI_STACKING_CUTOFF + 1.0]
                    if len(near_c) >= 4:
                        lc = centroid(near_c)
                        d = centroid_distance(rc, lc)
                        if d <= PI_STACKING_CUTOFF:
                            interactions.append(Interaction(
                                kind="pi_stacking",
                                distance=round(d, 2),
                                protein_chain=chain.id,
                                protein_resname=resname,
                                protein_resnum=residue.id[1],
                                protein_atom="ring",
                                ligand_atom="ring",
                            ))

    # De-duplicate: for each protein residue, keep only the closest contact per kind.
    best: dict[tuple[str, int, str, str], Interaction] = {}
    for ix in interactions:
        key = (ix.protein_chain, ix.protein_resnum, ix.kind, ix.protein_atom + ":" + ix.ligand_atom)
        prev = best.get(key)
        if prev is None or ix.distance < prev.distance:
            best[key] = ix
    interactions = sorted(best.values(), key=lambda i: (i.protein_chain, i.protein_resnum, i.distance))

    print(f"[interactions] found {len(interactions)} total (hbond={sum(1 for i in interactions if i.kind=='hbond')}, "
          f"salt={sum(1 for i in interactions if i.kind=='salt_bridge')}, "
          f"pi={sum(1 for i in interactions if i.kind=='pi_stacking')}, "
          f"contact={sum(1 for i in interactions if i.kind=='contact')})",
          file=sys.stderr)

    return AnalysisResult(pdbid=pdbid.upper(), title=title, ligand=ligand, interactions=interactions)


# ---------------------------------------------------------------------------
# LLM narration
# ---------------------------------------------------------------------------


NARRATION_SYSTEM = """You are a structural biology presenter.

You will be given the metadata for a protein-ligand complex and a list of detected
non-covalent interactions. Write narration for a slide deck intended to be read
aloud as a voiceover while the molecular viewer animates.

Output strict JSON with this shape:
{
  "intro": "...",
  "overview": "...",
  "pocket": "...",
  "ligand_closeup": "...",
  "interactions_overview": "...",
  "per_residue": [
    {"residue": "Asn253", "text": "..."},
    ...
  ],
  "summary": "..."
}

Rules:
- Each slide should be 2–4 sentences, conversational tone, no bullet points.
- Name specific atoms and distances when you have them.
- The `per_residue` array must have one entry per UNIQUE protein residue that
  interacts with the ligand. Preserve the residue-name + number formatting.
- Do NOT mention slide numbers, UI controls, or the viewer itself.
- Do NOT use markdown or headings.
- Return ONLY the JSON object — no commentary before or after."""


def build_narration_prompt(analysis: AnalysisResult) -> str:
    residues = {}
    for ix in analysis.interactions:
        key = f"{ix.protein_resname}{ix.protein_resnum}"
        residues.setdefault(key, []).append({
            "type": ix.kind,
            "protein_atom": ix.protein_atom,
            "ligand_atom": ix.ligand_atom,
            "distance": ix.distance,
        })

    payload = {
        "pdb_id": analysis.pdbid,
        "title": analysis.title,
        "ligand": {
            "resname": analysis.ligand.resname,
            "chain": analysis.ligand.chain,
            "heavy_atom_count": analysis.ligand.atom_count,
        },
        "unique_interacting_residues": list(residues.keys()),
        "interactions_by_residue": residues,
    }
    return json.dumps(payload, indent=2)


def call_openai(model: str, analysis: AnalysisResult) -> dict:
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise SystemExit("openai package required. pip install openai") from exc

    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY environment variable not set.")

    client = OpenAI()
    user_prompt = build_narration_prompt(analysis)

    print(f"[llm] requesting narration from {model}...", file=sys.stderr)
    resp = client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": NARRATION_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
    )
    text = resp.output_text.strip()
    # Strip a possible ```json fence
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        print("[llm] non-JSON response, dumping for debug:", file=sys.stderr)
        print(text, file=sys.stderr)
        raise SystemExit(f"Failed to parse LLM JSON: {exc}")


# ---------------------------------------------------------------------------
# .show file emission
# ---------------------------------------------------------------------------


def residue_sel(resname: str, resnum: int, chain: str) -> str:
    return f"/{chain}:{resnum}"


def format_show(analysis: AnalysisResult, narration: dict) -> str:
    pdbid = analysis.pdbid.lower()
    lig = analysis.ligand

    lines: list[str] = []
    lines.append(f"# {analysis.title or analysis.pdbid} — {lig.resname} in {analysis.pdbid}")

    def slide(body: str, cmds: list[str]) -> None:
        lines.append("---")
        lines.append("")
        for para in body.strip().split("\n"):
            lines.append(para)
        lines.append("")
        for c in cmds:
            lines.append(f"> {c}")
        lines.append("")

    # Slide 1: intro — load and cartoon
    slide(
        narration.get("intro", f"This is {analysis.pdbid}, a protein-ligand complex featuring {lig.resname}."),
        [
            "console hide",
            "close",
            f"load {pdbid}",
            "cartoon",
            "color bychain",
        ],
    )

    # Slide 2: overview with a slow spin
    slide(
        narration.get("overview", "Let's look at the overall fold."),
        [
            "reset",
            "spin 0.15",
        ],
    )

    # Slide 3: ligand close-up
    slide(
        narration.get("ligand_closeup", f"Here is the ligand, {lig.resname}."),
        [
            "stop",
            "select ligand",
            "style sel ball-and-stick",
            "color sel yellow",
            "focus sel",
        ],
    )

    # Slide 4: binding pocket surface
    slide(
        narration.get("pocket", "Now let's see the binding pocket shape."),
        [
            "surface",
            "surface transparency 0.6",
            "focus sel",
        ],
    )

    # Slide 5: all interactions
    slide(
        narration.get(
            "interactions_overview",
            "These are all the non-covalent interactions between the ligand and the protein, "
            "color-coded by type.",
        ),
        [
            "hide surface",
            "interactions",
            "focus sel",
        ],
    )

    # Slides 6..N: per-residue highlights
    residue_order: list[tuple[str, str, int]] = analysis.residues_touched()
    # Build a resname->chain/num lookup from the interactions
    resname_lookup: dict[str, tuple[str, str, int]] = {}
    for chain, rname, rnum in residue_order:
        resname_lookup[f"{rname}{rnum}"] = (chain, rname, rnum)

    seen_keys: set[str] = set()
    per_res = narration.get("per_residue") or []
    # Emit LLM-provided residue slides in their order when they map to a known residue.
    for entry in per_res:
        key = (entry.get("residue") or "").strip()
        if key not in resname_lookup or key in seen_keys:
            continue
        seen_keys.add(key)
        chain, rname, rnum = resname_lookup[key]
        sel = residue_sel(rname, rnum, chain)
        slide(
            entry.get("text", f"{key} contacts the ligand."),
            [
                f"select {sel}",
                "style sel ball-and-stick",
                "color sel cyan",
                f"focus {sel}",
            ],
        )

    # Fallback: any residues the LLM skipped still get a stub slide
    for chain, rname, rnum in residue_order:
        key = f"{rname}{rnum}"
        if key in seen_keys:
            continue
        seen_keys.add(key)
        sel = residue_sel(rname, rnum, chain)
        slide(
            f"{key} also makes contact with the ligand.",
            [
                f"select {sel}",
                "style sel ball-and-stick",
                "color sel cyan",
                f"focus {sel}",
            ],
        )

    # Final: summary
    slide(
        narration.get("summary", f"That's a tour of the {lig.resname} binding site in {analysis.pdbid}."),
        [
            "stop",
            "reset",
            "spin 0.1",
        ],
    )

    return "\n".join(lines).rstrip() + "\n"


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a .show file for a protein-ligand complex")
    parser.add_argument("pdbid", help="4-character PDB id (e.g., 1cbs)")
    parser.add_argument("resname", nargs="?", default=None,
                        help="Optional ligand residue name (e.g., REA). If omitted, auto-picked.")
    parser.add_argument("-o", "--output", help="Output .show file path (default: shows/generated/<pdbid>.show)")
    parser.add_argument("--model", default="o3", help="OpenAI model (default: o3)")
    parser.add_argument("--cache", default=None, help="PDB cache dir (default: ~/.cache/smol-gen-show)")
    parser.add_argument("--dump-json", action="store_true",
                        help="Print the analysis JSON to stdout instead of emitting a .show file")
    parser.add_argument("--no-llm", action="store_true",
                        help="Skip LLM; emit placeholder narration text (useful for debugging)")
    args = parser.parse_args()

    cache_dir = Path(args.cache) if args.cache else Path.home() / ".cache" / "smol-gen-show"
    pdb_path = fetch_pdb(args.pdbid, cache_dir)
    analysis = analyze(args.pdbid, pdb_path, args.resname)

    if args.dump_json:
        payload = {
            "pdbid": analysis.pdbid,
            "title": analysis.title,
            "ligand": asdict(analysis.ligand),
            "interactions": [asdict(i) for i in analysis.interactions],
        }
        print(json.dumps(payload, indent=2))
        return 0

    if args.no_llm:
        narration = {
            "intro": f"{analysis.pdbid}: {analysis.title}",
            "overview": "Overall fold (placeholder).",
            "pocket": "Binding pocket surface (placeholder).",
            "ligand_closeup": f"The ligand {analysis.ligand.resname} (placeholder).",
            "interactions_overview": "All non-covalent interactions (placeholder).",
            "per_residue": [
                {"residue": f"{r}{n}", "text": f"{r}{n} contacts the ligand (placeholder)."}
                for _, r, n in analysis.residues_touched()
            ],
            "summary": "End of tour (placeholder).",
        }
    else:
        narration = call_openai(args.model, analysis)

    show_text = format_show(analysis, narration)

    if args.output:
        out_path = Path(args.output)
    else:
        default_dir = Path(__file__).resolve().parent.parent / "shows" / "generated"
        default_dir.mkdir(parents=True, exist_ok=True)
        out_path = default_dir / f"{analysis.pdbid.lower()}.show"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(show_text)
    print(f"[done] wrote {out_path}", file=sys.stderr)
    print(str(out_path))
    return 0


if __name__ == "__main__":
    sys.exit(main())
