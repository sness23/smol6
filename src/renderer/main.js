import './styles/console.css';
import { initConsole, setConsoleMode } from './console.js';
import { initCommands, executeCommand } from './commands.js';
import { initViewer } from './viewer-init.js';
import { initSpacemouse } from './spacemouse.js';

var defaultPropsRef = { value: null };

initCommands(defaultPropsRef);
initConsole(executeCommand);
initViewer(defaultPropsRef, executeCommand);
initSpacemouse();

// Apply settings from ~/.smol
if (window.smolSettings) {
    window.smolSettings.get().then(function(settings) {
        if (settings.consoleMode) {
            setConsoleMode(settings.consoleMode);
        }
    });
}
