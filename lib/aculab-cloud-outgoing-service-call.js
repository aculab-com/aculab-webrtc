"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AculabCloudOutgoingServiceCall = void 0;
const aculab_cloud_outgoing_call_1 = require("./aculab-cloud-outgoing-call");
const sip_js_1 = require("sip.js");
class AculabCloudOutgoingServiceCall extends aculab_cloud_outgoing_call_1.AculabCloudOutgoingCall {
    constructor(client, serviceName) {
        var uri = new sip_js_1.URI("sip", serviceName, `sip-${client._cloud}.aculab.com;transport=tcp`);
        super(client, uri, {
            earlyMedia: true,
        }, undefined, false);
    }
}
exports.AculabCloudOutgoingServiceCall = AculabCloudOutgoingServiceCall;
