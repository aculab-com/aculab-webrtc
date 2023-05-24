WebRTC Demo using .JSP and Java Servlets
========================================

This demo allows you to create multiple WebRTC clients on different browser intances and make audio and video calls between them using WebRTC.
Most of it is written in JaveScript. The .JSP page makes calls via app-ajax.js to Java Servlets to obtain the demo configuration and to obtain a WebRTC token.

This demo is intended to be used with Apache Tomcat has been tested under Tomcat 9 and 10.  


SETUP:
- There are bash and batch install scripts in the directory above this one. Running them will compile the Java code, copy relevant resources into the ./WebRTCJavaDemo folder, and copy ./WebRTCJavaDemo to the webapps directory of your Tomcat installation.

- Set your cloud region (e.g. 1-2-0), cloud account username, API access key and WebRTC access key (obtained from the cloud console) in ./WebRTCJavaDemo/WEB-INF/web.xml.

- Restart Tomcat and you should be able to access the demo locally via:
http://localhost:<your Tomcat http port>/WebRTCJavaDemo/webrtc_vid.jsp



REMOTE ACCESS:
In order to access it from a remote machine SSL will need to be enabled in Tomcat.
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
On loading, the demo page calls the GetDemoConfigServlet via an Ajax call in app_ajax.js to get the default demo parameters.
The demo page calls the GetDemoWebRTCTokenServlet via an Ajax call in app_ajax.js to obtain the WebRTC token needed for the WebRTC calls.

Maven will download dependencies, compile servlet classes, and put them into ./WebRTCJavaDemo/WEB-INF/classes/ folder.