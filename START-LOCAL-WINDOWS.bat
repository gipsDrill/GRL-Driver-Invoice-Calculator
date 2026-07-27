@echo off
setlocal
title GRL Driver Pay and Invoices
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local.ps1"
if errorlevel 1 (
  echo.
  echo Local server could not start. You can still open index.html directly
  echo or upload the package to GitHub Pages.
  pause
)
