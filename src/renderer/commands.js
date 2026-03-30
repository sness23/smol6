import {
    addConsoleOutput, showConsole, hideConsole,
    setConsoleMode, isConsoleVisible,
    setConsoleAutoShow
} from './console.js';

var _defaultPropsRef = null;

export function initCommands(defaultPropsRef) {
    _defaultPropsRef = defaultPropsRef;
}

export function executeCommand(command, onResult) {
    var cb = onResult || function() {};

    var cmdParts = command.trim().split(/\s+/);

    // Handle "preset default" — global reset of all canvas3d parameters
    if (cmdParts[0].toLowerCase() === 'preset' && cmdParts.length > 1 && cmdParts[1].toLowerCase() === 'default') {
        if (_defaultPropsRef && _defaultPropsRef.value && window.viewer && window.viewer.plugin && window.viewer.plugin.canvas3d) {
            var c3d = window.viewer.plugin.canvas3d;
            var defaults = JSON.parse(JSON.stringify(_defaultPropsRef.value));
            c3d.setProps(defaults);
            window.viewer.plugin.managers.camera.reset();
            var msg = 'Reset all parameters to defaults';
            addConsoleOutput(msg);
            cb(msg);
        } else {
            var msg2 = 'Error: Viewer not ready or defaults not captured';
            addConsoleOutput(msg2);
            cb(msg2);
        }
        return;
    }

    // Handle console overlay/compact locally before molstar dispatch
    if (cmdParts[0].toLowerCase() === 'console' && cmdParts.length > 1) {
        var sub = cmdParts[1].toLowerCase();
        if (sub === 'overlay' || sub === 'compact') {
            setConsoleMode(sub);
            var msg3 = 'Console mode: ' + sub;
            addConsoleOutput(msg3);
            cb(msg3);
            return;
        }
    }

    // Pass to molstar console if available
    if (window.viewer && window.viewer.plugin && window.viewer.plugin.console) {
        window.viewer.plugin.console.execute(command).then(function(result) {
            var consoleAction = result.data && result.data.data && result.data.data.consoleAction;
            if (consoleAction) {
                if (consoleAction === 'hide') {
                    setConsoleAutoShow(false);
                    if (result.message) addConsoleOutput(result.message);
                    hideConsole();
                    cb(result.message || 'Console hidden');
                    return;
                } else if (consoleAction === 'show') {
                    setConsoleAutoShow(true);
                    showConsole();
                    if (result.message) addConsoleOutput(result.message);
                    cb(result.message || 'Console shown');
                    return;
                } else if (consoleAction === 'toggle') {
                    if (isConsoleVisible()) {
                        setConsoleAutoShow(false);
                        hideConsole();
                    } else {
                        setConsoleAutoShow(true);
                        showConsole();
                    }
                    if (result.message) addConsoleOutput(result.message);
                    cb(result.message || 'Console toggled');
                    return;
                } else if (consoleAction === 'overlay') {
                    setConsoleMode('overlay');
                    if (result.message) addConsoleOutput(result.message);
                    cb(result.message || 'Console overlay');
                    return;
                } else if (consoleAction === 'compact') {
                    setConsoleMode('compact');
                    if (result.message) addConsoleOutput(result.message);
                    cb(result.message || 'Console compact');
                    return;
                }
            }

            if (result.success) {
                if (result.message) {
                    addConsoleOutput(result.message);
                }
                cb(result.message || 'OK');
            } else {
                var errMsg = 'Error: ' + result.message;
                addConsoleOutput(errMsg);
                cb(errMsg);
            }
        }).catch(function(error) {
            var errMsg = 'Exception: ' + (error.message || String(error));
            addConsoleOutput(errMsg);
            cb(errMsg);
        });
        return;
    }

    // Fallback commands (when molstar console not available)
    var parts = command.split(/\s+/);
    var cmd = parts[0].toLowerCase();

    if (cmd === 'help') {
        executeHelpCommand(parts.slice(1).join(' '));
        cb('OK');
    } else if (cmd === 'load' && parts.length >= 2) {
        executeLoadCommand(parts[1]);
        cb('Loading PDB entry: ' + parts[1]);
    } else if (cmd === 'close') {
        executeCloseCommand();
        cb('Clearing all structures');
    } else if (cmd === 'color') {
        executeColorCommand(command);
        cb('OK');
    } else {
        var errMsg2 = 'Error: Unknown command. Type \'help\' for available commands.';
        addConsoleOutput(errMsg2);
        cb(errMsg2);
    }
}

function executeHelpCommand(commandName) {
    var result = window.molstar.executeHelp(window.viewer ? window.viewer.plugin : null, commandName);
    if (result.success && result.helpText) {
        addConsoleOutput(result.helpText);
    } else if (result.message) {
        addConsoleOutput(result.message);
    }
}

function executeLoadCommand(pdbId) {
    if (!window.viewer) {
        addConsoleOutput('Error: Viewer not initialized');
        return;
    }
    addConsoleOutput('Loading PDB entry: ' + pdbId);
    window.viewer.plugin.clear();
    window.viewer.loadPdb(pdbId);
}

function executeCloseCommand() {
    addConsoleOutput('Clearing all structures');
    if (window.viewer) {
        window.viewer.plugin.clear();
    }
}

function executeColorCommand(commandStr) {
    if (!window.viewer) {
        addConsoleOutput('Error: No structure loaded. Use "load <pdbid>" first.');
        return;
    }

    try {
        var colorCmd = window.molstar.parseColorCommand(commandStr);

        if (colorCmd.mode === 'unknown') {
            addConsoleOutput('Error: Invalid color command syntax');
            return;
        }

        if (colorCmd.mode === 'simple') {
            window.molstar.executeSimpleColor(window.viewer.plugin, colorCmd).then(function(result) {
                addConsoleOutput(result.message);
            }).catch(function(error) {
                addConsoleOutput('Error: ' + error);
            });
        } else {
            addConsoleOutput('Error: Color mode "' + colorCmd.mode + '" not yet implemented');
        }
    } catch (error) {
        addConsoleOutput('Error: ' + error.message);
    }
}
