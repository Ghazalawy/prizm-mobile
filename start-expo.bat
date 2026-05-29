@echo off
setlocal
REM Set Android SDK path explicitly so emulator works
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set NODE_HOME=C:\Program Files\nodejs
set PATH=%NODE_HOME%;%ANDROID_HOME%\emulator;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%

cd /d C:\wamp64\www\prizm-mobile

echo ============================================
echo   Prizm Mobile - Expo Dev Server
echo ============================================
echo.
echo API Target: http://10.0.2.2/prizm331
echo.
echo Commands after startup:
echo   a - Open Android emulator
echo   r - Reload app
echo   shift+r - Reload with cleared cache
echo.
echo Starting Metro bundler...
echo.
call npx expo start --clear
pause
