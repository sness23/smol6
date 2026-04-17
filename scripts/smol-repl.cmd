@echo off
rem smol-repl.cmd - Interactive REPL for smol6 on Windows.
rem Type commands and press Enter to send them over HTTP to the running smol6 app.
rem Type "quit" or Ctrl-C to exit.
rem Env: SMOL_HOST (default 127.0.0.1), SMOL_PORT (default 8888)

setlocal EnableDelayedExpansion
if "%SMOL_HOST%"=="" set SMOL_HOST=127.0.0.1
if "%SMOL_PORT%"=="" set SMOL_PORT=8888

echo smol-repl connected to http://%SMOL_HOST%:%SMOL_PORT%
echo Type a command and press Enter. Type "quit" to exit.
echo.

:loop
set "line="
set /p "line=smol^> "
if "!line!"=="" goto loop
if /i "!line!"=="quit" goto done
if /i "!line!"=="exit" goto done
curl -s -m 5 -X POST "http://%SMOL_HOST%:%SMOL_PORT%/command" -d "!line!"
echo.
goto loop

:done
endlocal
