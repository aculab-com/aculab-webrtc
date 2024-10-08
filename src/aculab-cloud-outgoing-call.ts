import {CallInviter} from './call-inviter';
import {AculabCloudCall} from './aculab-cloud-call';
import {MediaEventSessionDescriptionHandler} from './media-event-session-description-handler';
import {SessionState, URI, Core as sipCore} from 'sip.js';
import {AculabCloudClient} from './aculab-cloud-client';
import {CallOptions} from './types';

export class AculabCloudOutgoingCall extends AculabCloudCall {
  _uri: URI;
  invite_pending: boolean;
  _inviter_options: object;
  _accept_message: sipCore.IncomingResponseMessage | undefined;
  declare _session: CallInviter;

  constructor(
    client: AculabCloudClient,
    uri: URI,
    inviter_options: object,
    options: CallOptions | undefined,
    reinvite_possible: boolean,
    legacy_interface: boolean = false,
  ) {
    super(client, reinvite_possible, legacy_interface);
    this._uri = uri;
    this.invite_pending = false;
    this._inviter_options = inviter_options;
    this._sdh_options =
      MediaEventSessionDescriptionHandler.fixup_options(options);
    this._accept_message = undefined;

    if (this.client._isReady()) {
      this._doinvite();
    } else {
      this.invite_pending = true;
      // should we queue a timeout that results on _onterminate getting called
    }
  }

  /**
   * Set termination reason from response
   * @param response sip incoming response
   */
  _set_termination_reason_from_response(response: sipCore.IncomingResponse) {
    // get termination reason from response
    if (this._termination_reason === '' && response.message.statusCode) {
      this._termination_reason = this._get_reason_from_sip_code(
        response.message.statusCode.toString(),
      );
      this.client.console_log(
        `setting termination reason - reject - ${this._termination_reason}`,
      );
    }
  }

  /**
   * Answer call is answer is pending
   */
  _onclientready() {
    if (this.invite_pending) {
      this._doinvite();
    }
  }

  /**
   * Create new invite session
   */
  _doinvite() {
    this.client.console_log(
      'AculabCloudOutgoingCall: invite to "' + this._uri.toString() + '"',
    );
    this.session = new CallInviter(
      this,
      this.client._ua,
      this._uri,
      this._inviter_options,
    );
    const opts = {
      requestDelegate: {
        onProgress: (response: sipCore.IncomingResponse) => {
          this._progress(response);
        },
	onAccept: (response: sipCore.IncomingResponse) => {
	  this._accept(response);
	},
      },
      sessionDescriptionHandlerOptions: this._sdh_options,
    };
    void this._session?.invite(opts);
    this.invite_pending = false;
  }

  /**
   * ringing handler
   * @param response sip incoming response
   */
  _progress(response: sipCore.IncomingResponse) {
    if (response.message && response.message.statusCode === 180) {
      if (this.onRinging) {
        this.client.console_log('AculabCloudOutgoingCall calling onRinging');
        try {
          this.onRinging({call: this});
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          this.client.console_error(
            'AculabCloudOutgoingCall onRinging caused exception:' + err,
          );
        }
      }
    }
  }

  /**
   * accept handler
   * @param response sip incoming response
   */
  _accept(response: sipCore.IncomingResponse) {
    if (response.message && response.message.statusCode === 200) {
      this._accept_message = response.message;
    }
  }

  /**
   * Disconnect outbound call
   */
  disconnect() {
    this.client.console_log('AculabCloudOutgoingCall disconnect called');
    if (this.invite_pending) {
      this.invite_pending = false;
      this._termination_reason = 'NOANSWER';
      this.client.console_log(
        `setting termination reason - disconnect(noCall) - ${this._termination_reason}`,
      );
      this._onterminated();
    }
    if (this._session && !this._disconnect_called) {
      this._disconnect_called = true;
      if (this._session.state === SessionState.Established) {
        void this._session.bye();
      } else if (this._session.state === SessionState.Establishing) {
        if (this._termination_reason === '') {
          this._termination_reason = 'NOANSWER';
          this.client.console_log(
            `setting termination reason - disconnect - ${this._termination_reason}`,
          );
        }
        void this._session.cancel();
      } else {
        if (this._termination_reason == '') {
          this._termination_reason = 'CANCELLED';
          this.client.console_log(`setting termination reason - disconnect - ${this._termination_reason}`);
        }
        void this._session.cancel();
      }
    }
  }

  getSipHeaders(name: string) {
    return this._accept_message?.getHeaders(name);
  }
}
