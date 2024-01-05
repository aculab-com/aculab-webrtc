import {AculabCloudCall} from './aculab-cloud-call';
import {AculabCloudClient} from './aculab-cloud-client';
import {MediaEventSessionDescriptionHandler} from './media-event-session-description-handler';
import {SessionState} from 'sip.js';
import {CallOptions} from './types';
import {CallInvitation} from './call-invitation';

export class AculabCloudIncomingCall extends AculabCloudCall {
  answer_pending: boolean;
  declare _session: CallInvitation;

  constructor(client: AculabCloudClient, session: CallInvitation) {
    super(client, true, false);
    this.session = session;
    this.answer_pending = false;
  }

  /**
   * Answer incoming call.
   * @param options call options
   */
  answer(options: CallOptions) {
    this._sdh_options =
      MediaEventSessionDescriptionHandler.fixup_options(options);
    this.client.console_log('AculabCloudIncomingCall: answer requested');
    if (this.client._isReady()) {
      this._doanswer();
    } else {
      this.answer_pending = true;
      // should we queue a timeout that results on _onterminate getting called
    }
  }

  /**
   * Answer call is answer is pending
   */
  _onclientready() {
    if (this.answer_pending) {
      this._doanswer();
    }
  }

  /**
   * Accept call invitation
   */
  _doanswer() {
    this.client.console_log('AculabCloudIncomingCall: answering');
    if (this._session) {
      // FIXME: Allow video and audio for re invite
      const opts = {
        sessionDescriptionHandlerOptions: this._sdh_options,
      };
      void this._session.accept(opts);
    }
    this.answer_pending = false;
  }

  /**
   * Call is ringing.
   */
  ringing() {
    this.client.console_log('AculabCloudIncomingCall: ringing');
    if (this._session) {
      void this._session.progress();
    }
  }

  /**
   * Reject incoming call
   * @param cause sip status code number as string between 400 and 700
   */
  reject(cause?: string) {
    this.client.console_log('AculabCloudIncomingCall: reject(' + cause + ')');
    let int_cause = 486;
    if (cause) {
      try {
        int_cause = parseInt(cause);
        if (int_cause < 400 || int_cause > 699) {
          throw 'out of range';
        }
      } catch (err) {
        this.client.console_error(
          'AculabCloudIncomingCall: reject cause invalid - ' + cause,
        );
        int_cause = 486; // default to busy
      }
    }
    this.answer_pending = false;
    if (this._session) {
      if (
        this._session.state === SessionState.Initial ||
        this._session.state === SessionState.Establishing
      ) {
        void this._session.reject({statusCode: int_cause});
      } else {
        void this._session.bye({
          requestOptions: {
            extraHeaders: [`Reason: SIP; cause=${int_cause}; text="Rejected"`],
          },
        });
      }
    }
  }

  /**
   * Disconnect incoming call
   */
  disconnect() {
    this.client.console_log('AculabCloudIncomingCall disconnect called');
    if (this._session && !this._disconnect_called) {
      this._disconnect_called = true;
      this.client.console_log(`call in state ${this._session.state}`);
      if (
        this._session.state === SessionState.Initial ||
        this._session.state === SessionState.Establishing
      ) {
        this.reject();
      } else {
        void this._session.bye();
      }
    }
    this.answer_pending = false;
  }
}
