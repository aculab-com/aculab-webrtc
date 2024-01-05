import {Invitation} from 'sip.js';
import {MediaEventSessionDescriptionHandler} from './media-event-session-description-handler';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore CallInvitation incorrectly extends Invitation
export class CallInvitation extends Invitation {
  private _sessionDescriptionHandler:
    | MediaEventSessionDescriptionHandler
    | undefined;

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
}
