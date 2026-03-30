var consoleDiv, consoleOutput, consoleInput;
var commandHistory = [];
var historyIndex = -1;
var currentInput = '';
var consoleAutoShow = true;
var consoleMode = 'compact';

function loadHistory() {
    try {
        var saved = localStorage.getItem('molstar-console-history');
        if (saved) {
            commandHistory = JSON.parse(saved);
            historyIndex = commandHistory.length;
        }
    } catch (e) {
        console.warn('Failed to load command history:', e);
    }
}

function saveHistory() {
    try {
        var toSave = commandHistory.slice(-100);
        localStorage.setItem('molstar-console-history', JSON.stringify(toSave));
    } catch (e) {
        console.warn('Failed to save command history:', e);
    }
}

export function addToHistory(command) {
    if (!command || command.trim() === '') return;
    if (commandHistory.length > 0 && commandHistory[commandHistory.length - 1] === command) {
        return;
    }
    commandHistory.push(command);
    saveHistory();
    historyIndex = commandHistory.length;
}

function navigateHistory(direction) {
    if (commandHistory.length === 0) return;

    if (historyIndex === commandHistory.length) {
        currentInput = consoleInput.value;
    }

    if (direction === 'up') {
        if (historyIndex > 0) {
            historyIndex--;
            consoleInput.value = commandHistory[historyIndex];
        }
    } else if (direction === 'down') {
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            consoleInput.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            consoleInput.value = currentInput;
        }
    }

    consoleInput.setSelectionRange(consoleInput.value.length, consoleInput.value.length);
}

export function addConsoleOutput(text) {
    consoleOutput.textContent += text + '\n';
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

export function showConsole() {
    consoleDiv.classList.add('visible');
    consoleInput.focus();
}

export function hideConsole() {
    consoleDiv.classList.remove('visible');
}

export function setConsoleMode(mode) {
    if (mode === 'overlay') {
        consoleDiv.classList.add('overlay');
        consoleMode = 'overlay';
    } else {
        consoleDiv.classList.remove('overlay');
        consoleMode = 'compact';
    }
}

export function isConsoleVisible() {
    return consoleDiv.classList.contains('visible');
}

export function getConsoleAutoShow() {
    return consoleAutoShow;
}

export function setConsoleAutoShow(val) {
    consoleAutoShow = val;
}

export function initConsole(executeCommand) {
    consoleDiv = document.getElementById('console');
    consoleOutput = document.getElementById('console-output');
    consoleInput = document.getElementById('console-input');

    loadHistory();

    consoleOutput.addEventListener('wheel', function(e) {
        consoleOutput.scrollTop += e.deltaY;
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });

    showConsole();

    document.addEventListener('keydown', function(e) {
        if (e.key === 'F2') {
            e.preventDefault();
            if (consoleDiv.classList.contains('visible')) {
                hideConsole();
            } else {
                consoleAutoShow = true;
                showConsole();
            }
        } else if (e.key === 'Enter' && !consoleDiv.classList.contains('visible')) {
            e.preventDefault();
            consoleAutoShow = true;
            showConsole();
        }
    });

    consoleInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            hideConsole();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateHistory('up');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateHistory('down');
        } else if (e.key === 'Enter') {
            var command = consoleInput.value.trim();
            if (command) {
                addConsoleOutput('smol> ' + command);
                addToHistory(command);
                executeCommand(command);
                consoleInput.value = '';
                historyIndex = commandHistory.length;
                currentInput = '';
            }
        }
    });

    addConsoleOutput('welcome to smol.  type \'help\' for help');
}
