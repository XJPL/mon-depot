@echo off
setlocal enabledelayedexpansion

set "MODE=%~1"
if "%MODE%"=="" set "MODE=docker"

if /I "%MODE%"=="-h" goto usage
if /I "%MODE%"=="--help" goto usage

if "%PENNYLANE_ACCESS_TOKEN%"=="" (
  echo Erreur: PENNYLANE_ACCESS_TOKEN manquant.
  exit /b 1
)

set "ROOT=%~dp0"

if /I "%MODE%"=="docker" (
  where docker >nul 2>nul
  if errorlevel 1 (
    echo Erreur: docker n'est pas installe.
    exit /b 1
  )
  echo Demarrage via Docker...
  docker compose up --build
  exit /b %errorlevel%
)

if /I "%MODE%"=="local" (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo Erreur: npm n'est pas installe.
    exit /b 1
  )

  echo Demarrage API...
  start "server" cmd /k "cd /d "%ROOT%server" && npm install && npm run dev"

  echo Demarrage client...
  start "client" cmd /k "cd /d "%ROOT%client" && npm install && npm run dev"
  exit /b 0
)

:usage
echo Usage: start.cmd [docker^|local]
echo.
echo docker ^(par defaut^) : lance docker compose ^(API + client^)
echo local : lance server ^(node^) + client ^(vite^) en parallel
exit /b 1
