import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.json.simple.JSONObject;
import java.io.StringWriter;

@WebServlet("/GetDemoConfigServlet")
public class GetDemoConfigServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;

	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

		String cloudRegion = getServletContext().getInitParameter("CLOUD_REGION");
		String webRTCAccessKey = getServletContext().getInitParameter("CLOUD_WEBRTC_ACCESS_KEY");
		String webRTCTokenTTL = getServletContext().getInitParameter("CLOUD_WEBRTC_TOKEN_TTL");

		JSONObject obj = new JSONObject();

		obj.put("token", webRTCAccessKey);
		obj.put("cloud", cloudRegion);
        obj.put("ttl", webRTCTokenTTL);

		StringWriter out = new StringWriter();
		obj.writeJSONString(out);
		
		response.setContentType("application/json");
		response.getWriter().write(out.toString());
	}

}
