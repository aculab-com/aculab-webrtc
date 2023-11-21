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

  /**
   * get Media Event Session Description Handler
   */
  public get sessionDescriptionHandler():
    | MediaEventSessionDescriptionHandler
    | undefined {
    return this._sessionDescriptionHandler;
  }

  /**
   * Set Media Event Session Description Handler
   * @param sdh Media Event Session Description Handler
   */
  public setSessionDescriptionHandler(
    sdh: MediaEventSessionDescriptionHandler,
  ) {
    if (this._sessionDescriptionHandler) {
      throw new Error('Session description handler defined.');
    }
    this._sessionDescriptionHandler = sdh;
  }

  /**
   * Handle final response to initial INVITE.
   * @param inviteResponse - 3xx response.
   */
  onRedirect(inviteResponse: sipCore.IncomingResponse) {
    this.call._set_termination_reason_from_response(inviteResponse);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super['onRedirect'](inviteResponse);
  }

  /**
   * Handle final response to initial INVITE.
   * @param inviteResponse - 4xx, 5xx, or 6xx response.
   */
  onReject(inviteResponse: sipCore.IncomingResponse) {
    this.call._set_termination_reason_from_response(inviteResponse);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super['onReject'](inviteResponse);
  }
}
