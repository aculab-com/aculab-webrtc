import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.json.simple.JSONObject;
import java.io.StringWriter;
import java.lang.StringBuilder;
import java.net.URL;
import java.net.HttpURLConnection;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Base64;
import java.nio.charset.StandardCharsets;


@WebServlet("/GetDemoWebRTCTokenServlet")
public class GetDemoWebRTCTokenServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;

	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

		String clientId = request.getParameter("clientId");
		if (clientId == null || "".equals(clientId)) {
			// TODO: set error response!
		}

		String cloudRegion = getServletContext().getInitParameter("CLOUD_REGION");
		String cloudUsername = getServletContext().getInitParameter("CLOUD_USERNAME");
		String apiAccessKey = getServletContext().getInitParameter("CLOUD_API_ACCESS_KEY");
		String webRTCTokenTTL = getServletContext().getInitParameter("CLOUD_WEBRTC_TOKEN_TTL");

		String dest = String.format("https://ws-%s.aculabcloud.net/webrtc_generate_token", cloudRegion);
		dest += String.format("?client_id=%s", clientId);
		dest += String.format("&ttl=%s", webRTCTokenTTL);
		dest += "&enable_incoming=true";
		dest += "&call_client=*";

		URL url = new URL(dest);
		HttpURLConnection con = (HttpURLConnection)url.openConnection();
		con.setRequestMethod("GET");
		
		String auth = String.format("%s/%s:%s", cloudRegion, cloudUsername, apiAccessKey);
		byte[] encodedAuth = Base64.getEncoder().encode(auth.getBytes(StandardCharsets.UTF_8));
		String authHeaderValue = "Basic " + new String(encodedAuth);
		con.setRequestProperty("Authorization", authHeaderValue);

		BufferedReader br = null;
		int responseCode = con.getResponseCode();
		if (100 <= responseCode && responseCode <= 399) {
			br = new BufferedReader(new InputStreamReader(con.getInputStream()));
		}
		else {
 			br = new BufferedReader(new InputStreamReader(con.getErrorStream()));
		}
		
		StringBuilder sb = new StringBuilder();
		String output;
		while ((output = br.readLine()) != null) {
			sb.append(output);
		}

		response.setContentType("application/json");
		response.getWriter().write(sb.toString());
	}

}
