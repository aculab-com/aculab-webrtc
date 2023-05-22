WebRTC Demo using .JSP and Java Servlets
========================================

This demo allows you to create multiple webrtc clients on different browser intances and make audio and video calls between them using webRTC.
Most of it is written in javascript. The .JSP page makes calls via app-ajax.js to Java Servlets to obtain the demo configuration and to obtain a webrtc token.


This demo has been run under Apache Tomcat 9.  

SETUP:
Copy the WebRTCJavaDemo folder to the webapps location in tomcat.
Set your cloud region (e.g. 1-2-0), cloud account username, api access key and webRTC access key (obtained from the cloud console) in WEB-INF/web.xml.

Restart tomcat and you should be able to access the demo locally via:
http://localhost:<your tomcat http port>/WebRTCJavaDemo/webrtc_vid.jsp



REMOTE ACCESS:
In order to access it from a remote machine SSL will need to be enabled in tomcat.
Some notes for doing this are here: https://tomcat.apache.org/tomcat-9.0-doc/ssl-howto.html#Configuration

e.g.
    <Connector port="8443" protocol="org.apache.coyote.http11.Http11NioProtocol"
               maxThreads="150" SSLEnabled="true"
			   scheme="https" 
			   secure="true"
			   keystoreFile="<location of your .keystore>" 
			   keystorePass="<your .keystore password>"
			   clientAuth="false" sslProtocol="TLS"
			   >
			   
To access it remotely:
https://<your dev server>:8443/WebRTCJavaDemo/webrtc_vid.jsp



DEVELOPMENT NOTES:
On loading, the demo page calls the GetDemoConfigServlet via an ajax call in app_ajax.js to get the default demo parameters.
The demo page calls the GetDemoWebRTCTokenServlet via an ajax call in app_ajax.js to obtain the webrtc token needed for the webRTC calls.

You can compile the servlet classes using something like (from the WebRTCJavaDemo folder):
javac -classpath ".\WEB-INF\lib\servlet-api.jar;.\WEB-INF\lib\json-simple-1.1.1.jar" "./WEB-INF/classes/GetDemoWebRTCTokenServlet.java"