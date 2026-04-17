@echo off
rem smol-cmd.cmd - Send a single command to smol6 over HTTP (Windows equivalent of ./smol-cmd)
rem Usage: smol-cmd.cmd "load 1cbs"
rem        smol-cmd.cmd "color red"
rem Env: SMOL_HOST (default 127.0.0.1), SMOL_PORT (default 8888)

setlocal
if "%SMOL_HOST%"=="" set SMOL_HOST=127.0.0.1
if "%SMOL_PORT%"=="" set SMOL_PORT=8888

if "%~1"=="" (
    echo Usage: smol-cmd.cmd "command string"
    exit /b 1
)

curl -s -m 5 -X POST "http://%SMOL_HOST%:%SMOL_PORT%/command" -d "%~1"
echo.
endlocal
