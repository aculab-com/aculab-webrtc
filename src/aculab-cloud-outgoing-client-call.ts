import type {AculabCloudClient} from './aculab-cloud-client';
import {AculabCloudOutgoingCall} from './aculab-cloud-outgoing-call';
import {URI} from 'sip.js';
import {MediaEventSessionDescriptionHandler} from './media-event-session-description-handler';
import {CallOptions} from './types';

export class AculabCloudOutgoingClientCall extends AculabCloudOutgoingCall {
  constructor(
    client: AculabCloudClient,
    clientId: string,
    token: string,
    options: CallOptions,
  ) {
    // TODO: add option to allow video
    const uri = new URI(
      'sip',
      clientId,
      `${client._webRtcAccessKey}.webrtc-${client._cloud}.aculabcloud.net;transport=tcp`,
    );
    super(
      client,
      uri,
      {
        extraHeaders: ['Authorization: Bearer ' + token],
      },
      options,
      true,
      false,
    );
  }

  /**
   * Add media handlers to media description session handler.
   * @param sdh media description session handler
   */
  _add_media_handlers(sdh: MediaEventSessionDescriptionHandler) {
    super._add_media_handlers(sdh);
    // add transceivers if we want to receive (not needed if we are sending, but doesn't hurt)
    if (typeof RTCRtpTransceiver !== 'undefined') {
      if (this._sdh_options?.receiveAudio) {
        // '_peerConnection' is protected and only accessible within class 'SessionDescriptionHandler' and its subclasses.
        sdh['_peerConnection']!.addTransceiver('audio', {
          direction: 'recvonly',
        });
      }
      if (this._sdh_options?.receiveVideo) {
        // '_peerConnection' is protected and only accessible within class 'SessionDescriptionHandler' and its subclasses.
        sdh['_peerConnection']!.addTransceiver('video', {
          direction: 'recvonly',
        });
      }
    }
  }
}
