var _knobHudTimer = null;
var _knobHudEl = document.getElementById('knob-hud');
var _knobHudName = document.getElementById('knob-hud-name');
var _knobHudFill = document.getElementById('knob-hud-fill');
var _knobHudValue = document.getElementById('knob-hud-value');

export function showKnobHud(paramName, midiValue, displayValue, unit) {
    var pct = (midiValue / 127) * 100;
    _knobHudName.textContent = paramName;
    _knobHudFill.style.width = pct + '%';
    _knobHudValue.textContent = displayValue + (unit ? ' ' + unit : '');
    _knobHudEl.classList.add('visible');
    if (_knobHudTimer) clearTimeout(_knobHudTimer);
    _knobHudTimer = setTimeout(function() {
        _knobHudEl.classList.remove('visible');
    }, 1500);
}
