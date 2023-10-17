"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallInviter = void 0;
const sip_js_1 = require("sip.js");
/**
 * Used only for outbound calls?
 */
// @ts-ignore CallInviter incorrectly extends Inviter
class CallInviter extends sip_js_1.Inviter {
    call;
    _sessionDescriptionHandler;
    constructor(call, userAgent, targetURI, options = {}) {
        super(userAgent, targetURI, options);
        this.call = call;
    }
    get sessionDescriptionHandler() {
        return this._sessionDescriptionHandler;
    }
    setSessionDescriptionHandler(sdh) {
        if (this._sessionDescriptionHandler) {
            throw new Error("Session description handler defined.");
        }
        this._sessionDescriptionHandler = sdh;
    }
    onRedirect(response) {
        this.call._set_termination_reason_from_response(response);
        // @ts-ignore 'onReject' is private and only accessible within class 'Inviter'.
        super.onRedirect(response);
    }
    onReject(response) {
        this.call._set_termination_reason_from_response(response);
        // @ts-ignore 'onReject' is private and only accessible within class 'Inviter'.
        super.onReject(response);
    }
}
exports.CallInviter = CallInviter;
