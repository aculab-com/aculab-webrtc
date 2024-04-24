import { AculabCloudOutgoingCall } from "./aculab-cloud-outgoing-call.js";
import { URI } from "sip.js";

export class AculabCloudOutgoingServiceCall extends AculabCloudOutgoingCall {
	constructor(client, serviceName, callOptions) {
		var uri = new URI("sip", serviceName, `sip-${client._cloud}.aculab.com;transport=tcp`);
		super(client, uri, {
			earlyMedia: true,
		},
		callOptions);
	}
}
