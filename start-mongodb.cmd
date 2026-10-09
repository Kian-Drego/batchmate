@echo off
REM ---------------------------------------------------------------------------
REM Starts a local MongoDB server on 127.0.0.1:27017 using the standalone
REM binaries under %USERPROFILE%\mongodb. Required by the API (see MONGO_URI
REM in .env). Safe to run if MongoDB is already running.
REM ---------------------------------------------------------------------------

set "MONGOD_ROOT=%USERPROFILE%\mongodb"
set "MONGOD_BIN=%MONGOD_ROOT%\bin\mongod.exe"

if not exist "%MONGOD_BIN%" (
  echo [start-mongodb] mongod.exe not found at "%MONGOD_BIN%".
  echo [start-mongodb] Re-download MongoDB Community Server and extract mongod.exe there.
  exit /b 1
)

netstat -ano | findstr /r /c:"127.0.0.1:27017 .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo [start-mongodb] MongoDB already listening on 127.0.0.1:27017.
  exit /b 0
)

echo [start-mongodb] starting MongoDB on 127.0.0.1:27017 ...
start "MongoDB" /min "%MONGOD_BIN%" --dbpath "%MONGOD_ROOT%\data" --logpath "%MONGOD_ROOT%\log\mongod.log" --port 27017 --bind_ip 127.0.0.1
exit /b 0
