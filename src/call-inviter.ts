import {Inviter, URI, UserAgent, Core as sipCore} from 'sip.js';
import type {AculabCloudOutgoingCall} from './aculab-cloud-outgoing-call';
import {MediaEventSessionDescriptionHandler} from './media-event-session-description-handler';

/**
 * Used only for outbound calls?
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore CallInviter incorrectly extends Inviter
export class CallInviter extends Inviter {
  call: AculabCloudOutgoingCall;
  private _sessionDescriptionHandler:
    | MediaEventSessionDescriptionHandler
    | undefined;

  constructor(
    call: AculabCloudOutgoingCall,
    userAgent: UserAgent,
    targetURI: URI,
    options: object = {},
  ) {
    super(userAgent, targetURI, options);
    this.call = call;
  }

  public get sessionDescriptionHandler():
    | MediaEventSessionDescriptionHandler
    | undefined {
    return this._sessionDescriptionHandler;
  }

  public setSessionDescriptionHandler(
    sdh: MediaEventSessionDescriptionHandler,
  ) {
    if (this._sessionDescriptionHandler) {
      throw new Error('Session description handler defined.');
    }
    this._sessionDescriptionHandler = sdh;
  }

  onRedirect(response: sipCore.IncomingResponse) {
    this.call._set_termination_reason_from_response(response);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super['onRedirect'](response);
  }

  onReject(response: sipCore.IncomingResponse) {
    this.call._set_termination_reason_from_response(response);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super['onReject'](response);
  }
}