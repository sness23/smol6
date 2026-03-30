import { addConsoleOutput, showConsole, addToHistory, getConsoleAutoShow } from './console.js';

function getParam(name, regex) {
    var r = new RegExp(name + '=' + '(' + regex + ')[&]?', 'i');
    return decodeURIComponent(((window.location.search || '').match(r) || [])[1] || '');
}

export function initViewer(defaultPropsRef, executeCommand) {
    var debugMode = getParam('debug-mode', '[^&]+').trim() === '1';
    if (debugMode) window.molstar.setDebugMode(debugMode);

    var timingMode = getParam('timing-mode', '[^&]+').trim() === '1';
    if (timingMode) window.molstar.setTimingMode(timingMode);

    var collapseLeftPanel = getParam('collapse-left-panel', '[^&]+').trim() === '1';
    var pdbProvider = getParam('pdb-provider', '[^&]+').trim().toLowerCase();
    var emdbProvider = getParam('emdb-provider', '[^&]+').trim().toLowerCase();
    var mapProvider = getParam('map-provider', '[^&]+').trim().toLowerCase();
    var pixelScale = getParam('pixel-scale', '[^&]+').trim();
    var pickScale = getParam('pick-scale', '[^&]+').trim();
    var pickPadding = getParam('pick-padding', '[^&]+').trim();
    var transparency = getParam('transparency', '[^&]+').trim().toLowerCase();
    var preferWebgl1 = getParam('prefer-webgl1', '[^&]+').trim() === '1' || void 0;
    var allowMajorPerformanceCaveat = getParam('allow-major-performance-caveat', '[^&]+').trim() === '1';
    var powerPreference = getParam('power-preference', '[^&]+').trim().toLowerCase();
    var illumination = getParam('illumination', '[^&]+').trim() === '1';
    var resolutionMode = getParam('resolution-mode', '[^&]+').trim().toLowerCase();

    window.molstar.Viewer.create('app', {
        disabledExtensions: [],
        layoutShowControls: false,
        viewportShowExpand: false,
        collapseLeftPanel: collapseLeftPanel,
        pdbProvider: pdbProvider || 'pdbe',
        emdbProvider: emdbProvider || 'pdbe',
        volumeStreamingServer: (mapProvider || 'pdbe') === 'rcsb'
            ? 'https://maps.rcsb.org'
            : 'https://www.ebi.ac.uk/pdbe/densities',
        pixelScale: parseFloat(pixelScale) || 1,
        pickScale: parseFloat(pickScale) || 0.25,
        pickPadding: isNaN(parseFloat(pickPadding)) ? 1 : parseFloat(pickPadding),
        transparency: transparency || undefined,
        preferWebgl1: preferWebgl1,
        allowMajorPerformanceCaveat: allowMajorPerformanceCaveat,
        powerPreference: powerPreference || 'high-performance',
        illumination: illumination,
        resolutionMode: resolutionMode || 'auto'
    }).then(function(viewer) {
        window.viewer = viewer;
        viewer.plugin.canvas3d?.setProps({ renderer: { backgroundColor: 0x000000 }, trackball: { moveSpeed: 0.5 } });

        var snapshotId = getParam('snapshot-id', '[^&]+').trim();
        if (snapshotId) viewer.setRemoteSnapshot(snapshotId);

        var snapshotUrl = getParam('snapshot-url', '[^&]+').trim();
        var snapshotUrlType = getParam('snapshot-url-type', '[^&]+').toLowerCase().trim() || 'molj';
        if (snapshotUrl && snapshotUrlType) viewer.loadSnapshotFromUrl(snapshotUrl, snapshotUrlType);

        var structureUrl = getParam('structure-url', '[^&]+').trim();
        var structureUrlFormat = getParam('structure-url-format', '[a-z]+').toLowerCase().trim();
        var structureUrlIsBinary = getParam('structure-url-is-binary', '[^&]+').trim() === '1';
        if (structureUrl) viewer.loadStructureFromUrl(structureUrl, structureUrlFormat, structureUrlIsBinary);

        var mvsUrl = getParam('mvs-url', '[^&]+').trim();
        var mvsData = getParam('mvs-data', '[^&]+').trim();
        var mvsFormat = getParam('mvs-format', '[^&]+').trim() || 'mvsj';
        if (mvsUrl && mvsData) console.error('Cannot specify mvs-url and mvs-data URL parameters at the same time. Ignoring both.');
        else if (mvsUrl) viewer.loadMvsFromUrl(mvsUrl, mvsFormat);
        else if (mvsData) viewer.loadMvsData(mvsData, mvsFormat);

        var pdb = getParam('pdb', '[^&]+').trim();
        if (pdb) viewer.loadPdb(pdb);

        var pdbIhm = getParam('pdb-ihm', '[^&]+').trim();
        if (pdbIhm) viewer.loadPdbIhm(pdbIhm);
        var pdbDev = getParam('pdb-dev', '[^&]+').trim();
        if (pdbDev) viewer.loadPdbIhm(pdbDev);

        var emdb = getParam('emdb', '[^&]+').trim();
        if (emdb) viewer.loadEmdb(emdb);

        var afdb = getParam('afdb', '[^&]+').trim();
        if (afdb) viewer.loadAlphaFoldDb(afdb);

        var modelArchive = getParam('model-archive', '[^&]+').trim();
        if (modelArchive) viewer.loadModelArchive(modelArchive);

        window.addEventListener('unload', function() {
            viewer.dispose();
        });

        var event = new CustomEvent("molstarViewerCreated", { detail: { viewer: viewer } });
        window.dispatchEvent(event);

        // Listen for file to load from command line (via Electron IPC)
        if (window.ipcRenderer) {
            window.ipcRenderer.on('load-file', function(_event, filePath) {
                var ext = filePath.split('.').pop().toLowerCase();
                var format = ext;
                if (ext === 'pdb') format = 'pdb';
                else if (ext === 'sdf' || ext === 'mol') format = 'sdf';
                else if (ext === 'mol2') format = 'mol2';
                else if (ext === 'cif' || ext === 'mmcif') format = 'mmcif';
                else if (ext === 'xyz') format = 'xyz';
                else if (ext === 'gro') format = 'gro';

                var fileUrl = 'file://' + filePath;
                addConsoleOutput('Loading file: ' + filePath);
                viewer.loadStructureFromUrl(fileUrl, format, false);
            });

            // Listen for remote commands (via HTTP server on port 8888)
            window.ipcRenderer.on('execute-command', function(_event, command) {
                if (getConsoleAutoShow()) {
                    showConsole();
                }
                addConsoleOutput('smol> ' + command);
                addToHistory(command);
                executeCommand(command, function(result) {
                    window.ipcRenderer.send('command-result', result);
                });
            });
        }
    });

    // Capture default canvas3d props for "preset default" reset
    (function captureDefaults() {
        if (window.viewer && window.viewer.plugin && window.viewer.plugin.canvas3d) {
            var c3d = window.viewer.plugin.canvas3d;
            defaultPropsRef.value = JSON.parse(JSON.stringify(c3d.props));
        } else {
            setTimeout(captureDefaults, 500);
        }
    })();
}
