import { KNOB_DEFS } from './knob-defs.js';
import { showKnobHud } from './hud.js';

var DEFAULT_LIGHT = { inclination: 90, azimuth: 180, color: 16777215, intensity: 0.6 };

function buildNestedProp(path, value) {
    if (path.length === 1) return { [path[0]]: value };
    return { [path[0]]: { [path[1]]: value } };
}

function mapMidi(v, def) {
    var t = v / 127;
    var raw = def.min + t * (def.max - def.min);
    if (def.snap) return Math.round(raw / def.snap) * def.snap;
    if (def.round) return Math.round(raw);
    return raw;
}

export function handleClipfogEvent(ev, canvas3d, viewer) {
    var def = KNOB_DEFS[ev.param];
    if (!def) return;

    var v = ev.value;

    switch (def.type) {
        case 'simple': {
            var val = mapMidi(v, def);
            canvas3d.setProps(buildNestedProp(def.path, val));
            break;
        }
        case 'bool': {
            var boolVal = v >= 64;
            canvas3d.setProps(buildNestedProp(def.path, boolVal));
            break;
        }
        case 'fog': {
            var fogVal = mapMidi(v, def);
            canvas3d.setProps({ cameraFog: { name: 'on', params: { intensity: fogVal } } });
            break;
        }
        case 'light': {
            var lightVal = mapMidi(v, def);
            var lights = canvas3d.props.renderer.light.slice();
            while (lights.length <= def.lightIndex) lights.push(Object.assign({}, DEFAULT_LIGHT));
            lights[def.lightIndex] = Object.assign({}, lights[def.lightIndex], { [def.field]: lightVal });
            canvas3d.setProps({ renderer: { light: lights } });
            break;
        }
        case 'material': {
            var matVal = v / 127;
            var plugin = viewer.plugin;
            plugin.state.data.cells.forEach(function(cell) {
                if (cell && cell.obj && cell.obj.type && cell.obj.type.typeClass === 'Representation3D') {
                    var repr = cell.obj.data.repr;
                    if (repr && repr.renderObjects) {
                        for (var ri = 0; ri < repr.renderObjects.length; ri++) {
                            var ro = repr.renderObjects[ri];
                            var uc = ro.values[def.uniform];
                            if (uc && uc.ref) {
                                uc.ref = { id: uc.ref.id, version: uc.ref.version + 1, value: matVal, metadata: uc.ref.metadata };
                            }
                        }
                    }
                }
            });
            canvas3d.commit();
            canvas3d.requestDraw();
            break;
        }
    }

    // HUD feedback
    if (def.type === 'bool') {
        showKnobHud(def.display, v, v >= 64 ? 'ON' : 'OFF', '');
    } else {
        var dispVal = def.min + (v / 127) * (def.max - def.min);
        showKnobHud(def.display, v, dispVal.toFixed(def.decimals), def.unit);
    }
}
