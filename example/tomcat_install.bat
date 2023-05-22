@echo off

REM Define the source and destination directories
set "SOURCE_DIR=./webrtc-v3-webapp-demo/serving_static/static"
set "DEST_DIR=./WebRTCJavaDemo"

REM Check if the source directory exists
if not exist "%SOURCE_DIR%" (
  echo Source directory "%SOURCE_DIR%" does not exist.
  exit /b 1
)

REM Check if the destination directory exists, and create it if not
if not exist "%DEST_DIR%" (
  echo Destination directory "%DEST_DIR%" does not exist.
  exit /b 1
)

REM Copy the necessary directories from the source directory to the destination directory
echo Copying demo files to temp folder...
xcopy /E /I "%SOURCE_DIR%\images" "%DEST_DIR%\images"
xcopy /E /I "%SOURCE_DIR%\js" "%DEST_DIR%\js"
xcopy /E /I "%SOURCE_DIR%\sounds" "%DEST_DIR%\sounds"

echo Directories copied successfully from "%SOURCE_DIR%" to "%DEST_DIR%".


REM Check if CATALINA_HOME environment variable exists
set "setting_tomcat_dir=false"
if "%CATALINA_HOME%"=="" (
  echo CATALINA_HOME environment variable is not set.
  set "setting_tomcat_dir=true"
) else (
  echo CATALINA_HOME environment variable is set to "%CATALINA_HOME%".
  set /p "confirm=Is this the Tomcat directory you want to use? (Y/N): "
  if /I not "%confirm%"=="Y" (
    set "TOMCAT_DIR=%CATALINA_HOME%"
  ) else (
    set "settings_tomcat_dir=true"
  )
)

if "%setting_tomcat_dir%"=="true" (
  set /p "TOMCAT_DIR=Enter the installation directory of Apache Tomcat (e.g., C:\opt\tomcat): "
)

REM Check if the Tomcat directory exists
if not exist "%TOMCAT_DIR%" (
  echo Tomcat directory "%TOMCAT_DIR%" does not exist.
  exit /b 1
)

REM Copy the contents of DEST_DIR to the webapps sub-directory of Tomcat
xcopy /E /I "%DEST_DIR%" "%TOMCAT_DIR%\webapps\WebRTCJavaDemo"

echo.
echo Contents copied successfully to "%TOMCAT_DIR%\webapps\WebRTCJavaDemo".
echo Please update "%TOMCAT_DIR%\webapps\WebRTCJavaDemo\WEB-INF\web.xml" with your credentials.

echo.
echo The demo can be accessed at:
echo "http://localhost:<your tomcat http port>/WebRTCJavaDemo/webrtc_vid.jsp"
echo.

pause