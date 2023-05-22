#!/bin/bash

# Define the source and destination directories
SOURCE_DIR="./webrtc-v3-webapp-demo/serving_static/static"
DEST_DIR="./WebRTCJavaDemo"

# Check if the source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "Source directory '$SOURCE_DIR' does not exist."
  exit 1
fi

# Check if the destination directory exists, and create it if not
if [ ! -d "$DEST_DIR" ]; then
  echo "Destination directory '$DEST_DIR' does not exist."
  exit 1
fi

# Copy the necessary directories from the source directory to the destination directory
cp -R "$SOURCE_DIR/images" "$DEST_DIR/images"
cp -R "$SOURCE_DIR/js" "$DEST_DIR/js"
cp -R "$SOURCE_DIR/sounds" "$DEST_DIR/sounds"

echo "Directories copied successfully from '$SOURCE_DIR' to '$DEST_DIR'."

# Check if CATALINA_HOME environment variable exists
setting_tomcat_dir=false
if [ -z "$CATALINA_HOME" ]; then
  echo "CATALINA_HOME environment variable is not set."
  setting_tomcat_dir=true
else
  echo "CATALINA_HOME environment variable is set to '$CATALINA_HOME'."
  read -p "Is this the Tomcat directory you want to use? (Y/N): " confirm
  if [[ "$confirm" != [Yy]* ]]; then
    TOMCAT_DIR="$CATALINA_HOME"
  else
    settings_tomcat_dir=true
  fi
fi

if [ "$setting_tomcat_dir" = true ]; then
  read -p "Enter the installation directory of Apache Tomcat (e.g., /opt/tomcat): " TOMCAT_DIR
fi

# Check if the Tomcat directory exists
if [ ! -d "$TOMCAT_DIR" ]; then
  echo "Tomcat directory '$TOMCAT_DIR' does not exist."
  exit 1
fi

# Copy the contents of DEST_DIR to the webapps sub-directory of Tomcat
cp -R "$DEST_DIR" "$TOMCAT_DIR/webapps/WebRTCJavaDemo"

echo
echo "Contents copied successfully to '$TOMCAT_DIR/webapps/WebRTCJavaDemo'."
echo "Please update '$TOMCAT_DIR/webapps/WebRTCJavaDemo/WEB-INF/web.xml' with your credentials."

echo
echo "The demo can be accessed at:"
echo "http://localhost:<your tomcat http port>/WebRTCJavaDemo/webrtc_vid.jsp"
echo