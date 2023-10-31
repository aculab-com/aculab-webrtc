// import { Invitation } from "../node_modules/sip.js/lib/index";
import { AculabCloudCall } from "./aculab-cloud-call";
import { AculabCloudClient } from "./aculab-cloud-client";
import { MediaEventSessionDescriptionHandler } from "./media-event-session-description-handler";
import { SessionState, Invitation } from "sip.js";
import { CallOptions } from "./types";
import { CallInviter } from "./call-inviter";

export class AculabCloudIncomingCall extends AculabCloudCall {
  answer_pending: boolean;

  /**
   * @param {AculabCloudClient} client
   * @param {Invitation} session
   */
  constructor(client: AculabCloudClient, session: Invitation) {
    super(client, true);
    this.session = session;
    this.answer_pending = false;
  }
  answer(options: CallOptions) {
    this._sdh_options =
      MediaEventSessionDescriptionHandler.fixup_options(options);
    this.client.console_log("AculabCloudIncomingCall: answer requested");
    if (this.client._isReady()) {
      this._doanswer();
    } else {
      this.answer_pending = true;
      // should we queue a timeout that results on _onterminate getting called
    }
  }
  _onclientready() {
    if (this.answer_pending) {
      this._doanswer();
    }
  }
  _doanswer() {
    this.client.console_log("AculabCloudIncomingCall: answering");
    if (this._session) {
      // FIXME: Allow video and audio for re invite
      let opts = {
        sessionDescriptionHandlerOptions: this._sdh_options,
      };
      (this._session as Invitation).accept(opts);
    }
    this.answer_pending = false;
  }
  ringing() {
    this.client.console_log("AculabCloudIncomingCall: ringing");
    if (this._session) {
      (this._session as Invitation).progress();
    }
  }
  reject(cause?: string) {
    this.client.console_log("AculabCloudIncomingCall: reject(" + cause + ")");
    let int_cause = 486;
    if (cause) {
      try {
        int_cause = parseInt(cause);
        if (int_cause < 400 || int_cause > 699) {
          throw "out of range";
        }
      } catch (err) {
        this.client.console_error(
          "AculabCloudIncomingCall: reject cause invalid - " + cause,
        );
        int_cause = 486; // default to busy
      }
    }
    this.answer_pending = false;
    if (this._session) {
      if (
        this._session.state == SessionState.Initial ||
        this._session.state == SessionState.Establishing
      ) {
        (this._session as Invitation).reject({ statusCode: int_cause });
      } else {
        this._session.bye({
          requestOptions: {
            extraHeaders: [`Reason: SIP; cause=${int_cause}; text="Rejected"`],
          },
        });
      }
    }
  }
  disconnect() {
    this.client.console_log("AculabCloudIncomingCall disconnect called");
    if (this._session && !this._disconnect_called) {
      this._disconnect_called = true;
      this.client.console_log(`call in state ${this._session.state}`);
      if (
        this._session.state == SessionState.Initial ||
        this._session.state == SessionState.Establishing
      ) {
        this.reject();
      } else {
        this._session.bye();
      }
    }
    this.answer_pending = false;
  }
}
