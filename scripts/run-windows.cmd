@echo off
setlocal

where node >nul 2>nul
if errorlevel 1 goto node_missing

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 26 ? 0 : 1)" >nul 2>nul
if errorlevel 1 goto node_version

node "%~dp0defftra-router.mjs" %*
set "DEFFTRA_EXIT_CODE=%ERRORLEVEL%"
if not "%DEFFTRA_EXIT_CODE%"=="0" (
  echo.
  echo Defftra Router stopped with an error.
  pause
)
exit /b %DEFFTRA_EXIT_CODE%

:node_missing
echo Node.js 26 or newer is required but was not found in PATH.
pause
exit /b 1

:node_version
echo Node.js 26 or newer is required. The installed version is:
node --version
pause
exit /b 1
