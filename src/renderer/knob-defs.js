/**
 * Declarative knob parameter definitions.
 *
 * Types:
 *   'simple'   — canvas3d.setProps() with a nested property path
 *   'bool'     — boolean toggle at MIDI threshold 64
 *   'light'    — modify renderer.light array element
 *   'material' — update Representation3D render object uniforms
 *   'fog'      — special cameraFog structure
 *
 * Fields:
 *   type, path, min, max        — mapping behaviour
 *   round                       — Math.round the mapped value
 *   snap                        — round to nearest multiple (e.g. 10)
 *   lightIndex, field           — for 'light' type
 *   uniform                     — for 'material' type
 *   display, decimals, unit     — HUD feedback
 */
export const KNOB_DEFS = {
    // === Page 1 — Core rendering ===
    clipRadius:            { type: 'simple', path: ['cameraClipping', 'radius'],          min: 1,   max: 200,  display: 'Clip Radius',     decimals: 1, unit: '' },
    minNear:               { type: 'simple', path: ['cameraClipping', 'minNear'],          min: 0.1, max: 50,   display: 'Min Near',        decimals: 1, unit: '' },
    fog:                   { type: 'fog',                                                   min: 0,   max: 100,  display: 'Fog',             decimals: 1, unit: '%' },
    exposure:              { type: 'simple', path: ['renderer', 'exposure'],                min: 0,   max: 3,    display: 'Exposure',        decimals: 2, unit: '' },
    ambient:               { type: 'simple', path: ['renderer', 'ambientIntensity'],        min: 0,   max: 2,    display: 'Ambient',         decimals: 2, unit: '' },
    lightIntensity:        { type: 'light',  lightIndex: 0, field: 'intensity',             min: 0,   max: 5,    display: 'Light',           decimals: 2, unit: '' },
    fov:                   { type: 'simple', path: ['camera', 'fov'],                       min: 10,  max: 130,  display: 'FOV',             decimals: 0, unit: '\u00b0' },
    sceneRadius:           { type: 'simple', path: ['sceneRadiusFactor'],                   min: 1,   max: 10,   display: 'Scene Radius',    decimals: 1, unit: 'x' },
    lightInclination:      { type: 'light',  lightIndex: 0, field: 'inclination',           min: 0,   max: 180,  display: 'Light Incl.',     decimals: 0, unit: '\u00b0' },
    lightAzimuth:          { type: 'light',  lightIndex: 0, field: 'azimuth',               min: 0,   max: 360,  display: 'Light Azim.',     decimals: 0, unit: '\u00b0' },

    // === Page 2 — Shading & Interaction ===
    interiorDarkening:     { type: 'simple', path: ['renderer', 'interiorDarkening'],       min: 0,   max: 1,    display: 'Int. Darken',     decimals: 2, unit: '' },
    celSteps:              { type: 'simple', path: ['renderer', 'celSteps'],                min: 2,   max: 16,   display: 'Cel Steps',       decimals: 0, unit: '',   round: true },
    xrayEdge:              { type: 'simple', path: ['renderer', 'xrayEdgeFalloff'],         min: 0,   max: 3,    display: 'X-Ray Edge',      decimals: 2, unit: '' },
    rotateSpeed:           { type: 'simple', path: ['trackball', 'rotateSpeed'],            min: 1,   max: 10,   display: 'Rotate Spd',      decimals: 0, unit: '',   round: true },
    zoomSpeed:             { type: 'simple', path: ['trackball', 'zoomSpeed'],              min: 1,   max: 15,   display: 'Zoom Spd',        decimals: 0, unit: '',   round: true },
    panSpeed:              { type: 'simple', path: ['trackball', 'panSpeed'],               min: 0.1, max: 5,    display: 'Pan Spd',         decimals: 1, unit: '' },
    edgeScale:             { type: 'simple', path: ['marking', 'edgeScale'],                min: 1,   max: 3,    display: 'Edge Scale',      decimals: 0, unit: '',   round: true },
    ghostEdge:             { type: 'simple', path: ['marking', 'ghostEdgeStrength'],        min: 0,   max: 1,    display: 'Ghost Edge',      decimals: 2, unit: '' },
    highlightStrength:     { type: 'simple', path: ['renderer', 'highlightStrength'],       min: 0,   max: 1,    display: 'Highlight',       decimals: 2, unit: '' },
    selectStrength:        { type: 'simple', path: ['renderer', 'selectStrength'],          min: 0,   max: 1,    display: 'Select',          decimals: 2, unit: '' },
    dimStrength:           { type: 'simple', path: ['renderer', 'dimStrength'],             min: 0,   max: 1,    display: 'Dim',             decimals: 2, unit: '' },
    resetDuration:         { type: 'simple', path: ['cameraResetDurationMs'],               min: 0,   max: 1000, display: 'Reset Dur.',      decimals: 0, unit: 'ms', round: true },
    innerEdge:             { type: 'simple', path: ['marking', 'innerEdgeFactor'],          min: 0,   max: 3,    display: 'Inner Edge',      decimals: 2, unit: '' },
    dpoit:                 { type: 'simple', path: ['dpoitIterations'],                     min: 1,   max: 10,   display: 'Depth Peel',      decimals: 0, unit: '',   round: true },
    pickPadding:           { type: 'simple', path: ['pickPadding'],                         min: 0,   max: 10,   display: 'Pick Pad',        decimals: 0, unit: 'px', round: true },
    highlightEdgeStrength: { type: 'simple', path: ['marking', 'highlightEdgeStrength'],    min: 0,   max: 1,    display: 'Hi Edge',         decimals: 2, unit: '' },

    // === Page 3 — Materials & Quality ===
    multisampleLevel:      { type: 'simple', path: ['multiSample', 'sampleLevel'],          min: 0,   max: 5,    display: 'Multisample',     decimals: 0, unit: '',   round: true },
    interactionFps:        { type: 'simple', path: ['interaction', 'maxFps'],               min: 10,  max: 60,   display: 'Interact FPS',    decimals: 0, unit: '',   snap: 10 },
    moveSpeed:             { type: 'simple', path: ['trackball', 'moveSpeed'],              min: 0.1, max: 3,    display: 'Move Spd',        decimals: 1, unit: '' },
    boostFactor:           { type: 'simple', path: ['trackball', 'boostMoveFactor'],        min: 0.1, max: 10,   display: 'Boost',           decimals: 1, unit: 'x' },
    giEnable:              { type: 'bool',   path: ['illumination', 'enabled'],                                    display: 'GI',              unit: '' },
    giBounces:             { type: 'simple', path: ['illumination', 'bounces'],             min: 1,   max: 32,   display: 'GI Bounces',      decimals: 0, unit: '',   round: true },
    giShadowEnable:        { type: 'bool',   path: ['illumination', 'shadowEnable'],                               display: 'GI Shadows',      unit: '' },
    giTargetFps:           { type: 'simple', path: ['illumination', 'targetFps'],           min: 0,   max: 120,  display: 'GI Target FPS',   decimals: 0, unit: '',   round: true },

    // === Page 4 — Second Light, Debug & Misc ===
    light2Inclination:     { type: 'light',  lightIndex: 1, field: 'inclination',           min: 0,   max: 180,  display: 'Light2 Incl.',    decimals: 0, unit: '\u00b0' },
    light2Azimuth:         { type: 'light',  lightIndex: 1, field: 'azimuth',               min: 0,   max: 360,  display: 'Light2 Azim.',    decimals: 0, unit: '\u00b0' },
    light2Intensity:       { type: 'light',  lightIndex: 1, field: 'intensity',             min: 0,   max: 5,    display: 'Light2',          decimals: 2, unit: '' },
    pickingAlpha:          { type: 'simple', path: ['renderer', 'pickingAlphaThreshold'],   min: 0,   max: 1,    display: 'Pick Alpha',      decimals: 2, unit: '' },
    metalness:             { type: 'material', uniform: 'uMetalness',                       min: 0,   max: 1,    display: 'Metalness',       decimals: 2, unit: '' },
    roughness:             { type: 'material', uniform: 'uRoughness',                       min: 0,   max: 1,    display: 'Roughness',       decimals: 2, unit: '' },
    bumpiness:             { type: 'material', uniform: 'uBumpiness',                       min: 0,   max: 1,    display: 'Bumpiness',       decimals: 2, unit: '' },
    selectEdgeStrength:    { type: 'simple', path: ['marking', 'selectEdgeStrength'],       min: 0,   max: 1,    display: 'Sel Edge',        decimals: 2, unit: '' },
    transparentBg:         { type: 'bool',   path: ['transparentBackground'],                                      display: 'Transp. BG',      unit: '' },
    interiorColorFlag:     { type: 'bool',   path: ['renderer', 'interiorColorFlag'],                              display: 'Int. Color',       unit: '' },
    colorMarker:           { type: 'bool',   path: ['renderer', 'colorMarker'],                                    display: 'Color Marker',     unit: '' },
    markingEnabled:        { type: 'bool',   path: ['marking', 'enabled'],                                         display: 'Marking',          unit: '' },
    flyMode:               { type: 'bool',   path: ['trackball', 'flyMode'],                                       display: 'Fly Mode',         unit: '' },
    hizEnabled:            { type: 'bool',   path: ['hiZ', 'enabled'],                                             display: 'HiZ',              unit: '' },
    hizFrameLag:           { type: 'simple', path: ['hiZ', 'maxFrameLag'],                  min: 1,   max: 30,   display: 'HiZ Lag',         decimals: 0, unit: '',   round: true },
    debugSceneBounds:      { type: 'bool',   path: ['debug', 'sceneBoundingSpheres'],                              display: 'Dbg Scene',        unit: '' },
    debugObjBounds:        { type: 'bool',   path: ['debug', 'objectBoundingSpheres'],                             display: 'Dbg Obj',          unit: '' },
    userInteractionMs:     { type: 'simple', path: ['userInteractionReleaseMs'],            min: 0,   max: 1000, display: 'Interact Ms',     decimals: 0, unit: 'ms', round: true },
    debugVisibleBounds:    { type: 'bool',   path: ['debug', 'visibleSceneBoundingSpheres'],                       display: 'Dbg Visible',      unit: '' },
};
