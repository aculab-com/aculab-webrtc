"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AculabCloudOutgoingClientCall = void 0;
const aculab_cloud_outgoing_call_js_1 = require("./aculab-cloud-outgoing-call.js");
const sip_js_1 = require("sip.js");
class AculabCloudOutgoingClientCall extends aculab_cloud_outgoing_call_js_1.AculabCloudOutgoingCall {
    constructor(client, clientId, token, options) {
        // TODO add option to allow video
        let uri = new sip_js_1.URI("sip", clientId, `${client._webRtcAccessKey}.webrtc-${client._cloud}.aculabcloud.net;transport=tcp`);
        super(client, uri, {
            extraHeaders: ["Authorization: Bearer " + token],
        }, options, true);
    }
    _add_media_handlers(sdh) {
        super._add_media_handlers(sdh);
        // add transceivers if we want to receive (not needed if we are sending, but doesn't hurt)
        if (typeof RTCRtpTransceiver !== "undefined") {
            if (this._sdh_options?.receiveAudio) {
                // @ts-ignore '_peerConnection' is protected and only accessible within class 'SessionDescriptionHandler' and its subclasses.
                sdh._peerConnection.addTransceiver("audio", { direction: "recvonly" });
            }
            if (this._sdh_options?.receiveVideo) {
                // @ts-ignore '_peerConnection' is protected and only accessible within class 'SessionDescriptionHandler' and its subclasses.
                sdh._peerConnection.addTransceiver("video", { direction: "recvonly" });
            }
        }
    }
}
exports.AculabCloudOutgoingClientCall = AculabCloudOutgoingClientCall;
