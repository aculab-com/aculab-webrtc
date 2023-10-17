"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AculabCloudOutgoingCall = void 0;
const call_inviter_js_1 = require("./call-inviter.js");
const aculab_cloud_call_js_1 = require("./aculab-cloud-call.js");
const media_event_session_description_handler_js_1 = require("./media-event-session-description-handler.js");
const sip_js_1 = require("sip.js");
class AculabCloudOutgoingCall extends aculab_cloud_call_js_1.AculabCloudCall {
    _uri;
    invite_pending;
    _inviter_options;
    constructor(client, uri, inviter_options, options, reinvite_possible) {
        super(client, reinvite_possible);
        this._uri = uri;
        this.invite_pending = false;
        this._inviter_options = inviter_options;
        this._sdh_options = media_event_session_description_handler_js_1.MediaEventSessionDescriptionHandler.fixup_options(options);
        if (this.client._isReady()) {
            this._doinvite();
        }
        else {
            this.invite_pending = true;
            // should we queue a timeout that results on _onterminate getting called
        }
    }
    _set_termination_reason_from_response(response) {
        // get termination reason from response
        if (this._termination_reason == '' && response.message.statusCode) {
            this._termination_reason = this._get_reason_from_sip_code(response.message.statusCode.toString());
            this.client.console_log(`setting termination reason - reject - ${this._termination_reason}`);
        }
    }
    _onclientready() {
        if (this.invite_pending) {
            this._doinvite();
        }
    }
    _doinvite() {
        this.client.console_log('AculabCloudOutgoingCall: invite to "' + this._uri + '"');
        this.session = new call_inviter_js_1.CallInviter(this, this.client._ua, this._uri, this._inviter_options);
        const opts = {
            requestDelegate: {
                onProgress: (response) => {
                    this._progress(response);
                }
            },
            sessionDescriptionHandlerOptions: this._sdh_options
        };
        // opts.sessionDescriptionHandlerOptions = this._sdh_options;
        this._session?.invite(opts);
        this.invite_pending = false;
    }
    _progress(response) {
        if (response.message && response.message.statusCode == 180) {
            if (this.onRinging) {
                this.client.console_log('AculabCloudOutgoingCall calling onRinging');
                try {
                    this.onRinging({ 'call': this });
                }
                catch (err) {
                    this.client.console_error('AculabCloudOutgoingCall onRinging caused exception:' + err.message);
                }
            }
        }
    }
    disconnect() {
        this.client.console_log('AculabCloudOutgoingCall disconnect called');
        if (this.invite_pending) {
            this.invite_pending = false;
            this._termination_reason = 'NOANSWER';
            this.client.console_log(`setting termination reason - disconnect(noCall) - ${this._termination_reason}`);
            this._onterminated();
        }
        if (this._session && !this._disconnect_called) {
            this._disconnect_called = true;
            if (this._session.state == sip_js_1.SessionState.Established) {
                this._session.bye();
            }
            else if (this._session.state == sip_js_1.SessionState.Establishing) {
                if (this._termination_reason == '') {
                    this._termination_reason = 'NOANSWER';
                    this.client.console_log(`setting termination reason - disconnect - ${this._termination_reason}`);
                }
                this._session.cancel();
            }
        }
    }
}
exports.AculabCloudOutgoingCall = AculabCloudOutgoingCall;
