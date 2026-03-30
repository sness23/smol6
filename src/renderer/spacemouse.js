import { handleClipfogEvent } from './knobs.js';

var ROTATE_SCALE = 0.000015625;
var TRANSLATE_SCALE = 0.00078125;

export function initSpacemouse() {
    if (!window.ipcRenderer) return;

    window.ipcRenderer.on('spacemouse-event', function(_event, data) {
        try {
            var ev = JSON.parse(data);

            var viewer = window.viewer;
            if (!viewer || !viewer.plugin || !viewer.plugin.canvas3d) return;
            var canvas3d = viewer.plugin.canvas3d;

            // Handle clip/fog control events
            if (ev.type === 'clipfog') {
                handleClipfogEvent(ev, canvas3d, viewer);
                return;
            }

            if (ev.type !== 'motion') return;

            var camera = canvas3d.camera;
            if (!camera) return;

            // Apply rotation (rx, ry, rz) and translation (x, y, z)
            var snapshot = camera.getSnapshot();
            var rx = -ev.rx * ROTATE_SCALE;
            var ry = -ev.ry * ROTATE_SCALE;
            var rz = -ev.rz * ROTATE_SCALE;
            var tx = -ev.x * TRANSLATE_SCALE;
            var ty = -ev.y * TRANSLATE_SCALE;
            var tz = -ev.z * TRANSLATE_SCALE;

            // Use Mol*'s camera rotation via trackball-like approach
            canvas3d.requestCameraReset({
                snapshot: (function() {
                    var s = Object.assign({}, snapshot);
                    // Rotate around target
                    var up = [s.up[0], s.up[1], s.up[2]];
                    var pos = [s.position[0], s.position[1], s.position[2]];
                    var target = [s.target[0], s.target[1], s.target[2]];

                    // Direction from target to position
                    var dx = pos[0] - target[0];
                    var dy = pos[1] - target[1];
                    var dz = pos[2] - target[2];
                    var dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

                    // Forward vector
                    var fx = -dx/dist, fy = -dy/dist, fz = -dz/dist;
                    // Right vector = forward x up
                    var rightX = fy*up[2] - fz*up[1];
                    var rightY = fz*up[0] - fx*up[2];
                    var rightZ = fx*up[1] - fy*up[0];
                    var rLen = Math.sqrt(rightX*rightX + rightY*rightY + rightZ*rightZ);
                    rightX /= rLen; rightY /= rLen; rightZ /= rLen;

                    // Rotate around up axis (ry from spacemouse)
                    var cosA = Math.cos(ry), sinA = Math.sin(ry);
                    var ndx = dx*cosA + rightX*dist*sinA;
                    var ndy = dy*cosA + rightY*dist*sinA;
                    var ndz = dz*cosA + rightZ*dist*sinA;

                    // Rotate around right axis (rx from spacemouse)
                    var cosB = Math.cos(rx), sinB = Math.sin(rx);
                    var ux = up[0], uy = up[1], uz = up[2];
                    var dx2 = ndx*cosB - ux*dist*sinB;
                    var dy2 = ndy*cosB - uy*dist*sinB;
                    var dz2 = ndz*cosB - uz*dist*sinB;

                    var newDist = Math.sqrt(dx2*dx2 + dy2*dy2 + dz2*dz2);
                    dx2 = dx2/newDist * dist;
                    dy2 = dy2/newDist * dist;
                    dz2 = dz2/newDist * dist;

                    // Update up vector for rx rotation
                    var newFx = -dx2/dist, newFy = -dy2/dist, newFz = -dz2/dist;
                    var newUpX = ux*cosB + newFx*sinB;
                    var newUpY = uy*cosB + newFy*sinB;
                    var newUpZ = uz*cosB + newFz*sinB;

                    // Rotate around forward axis (rz - roll)
                    var cosC = Math.cos(rz), sinC = Math.sin(rz);
                    // Recompute right vector after previous rotations
                    var newRightX = newFy*newUpZ - newFz*newUpY;
                    var newRightY = newFz*newUpX - newFx*newUpZ;
                    var newRightZ = newFx*newUpY - newFy*newUpX;
                    var rLen2 = Math.sqrt(newRightX*newRightX + newRightY*newRightY + newRightZ*newRightZ);
                    newRightX /= rLen2; newRightY /= rLen2; newRightZ /= rLen2;
                    // Roll: rotate up vector around forward axis
                    var rolledUpX = newUpX*cosC + newRightX*sinC;
                    var rolledUpY = newUpY*cosC + newRightY*sinC;
                    var rolledUpZ = newUpZ*cosC + newRightZ*sinC;
                    newUpX = rolledUpX; newUpY = rolledUpY; newUpZ = rolledUpZ;

                    // Translate target (x=right, y=up, z=forward)
                    target[0] += rightX*tx + up[0]*ty + fx*tz;
                    target[1] += rightY*tx + up[1]*ty + fy*tz;
                    target[2] += rightZ*tx + up[2]*ty + fz*tz;

                    // Move camera with target (no zoom from tz)
                    s.position = [target[0] + dx2, target[1] + dy2, target[2] + dz2];
                    s.target = target;
                    s.up = [newUpX, newUpY, newUpZ];
                    return s;
                })(),
                durationMs: 0
            });
        } catch (e) {
            // ignore parse errors
        }
    });
}
