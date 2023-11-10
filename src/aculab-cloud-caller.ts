'use strict';

import {AculabCloudClient} from './aculab-cloud-client';
import {AculabCloudOutgoingServiceCall} from './aculab-cloud-outgoing-service-call';
import {DisconnectedCallObj, MediaCallObj} from './types';

// NB this is the old v1 api, implemented using the new api
export class AculabCloudCaller {
  acc: AculabCloudClient | null;
  oc: AculabCloudOutgoingServiceCall | null;
  logLevel = 6;
  iceServers = null;
  onDisconnect?: (callObj: DisconnectedCallObj) => void;
  onRinging?: () => void;
  onMedia?: (callObj: MediaCallObj) => void;
  onConnecting?: () => void;
  onConnected?: () => void;
  onError?: () => void;
  onIncoming?: () => void;
  onRegistered?: () => void;
  onUnregistered?: () => void;
  onRegisterFail?: () => void;
  makeCall: (
    a_targetcloudid: string,
    a_targetservice: string,
    a_callerid: string,
  ) => void;
  isSupported: () => boolean;
  sendDtmf: (dtmf: string) => void;
  disconnect: () => void;
  attachMediaStreamToElement: (
    element: HTMLVideoElement,
    stream: MediaStream,
  ) => void;
  detachMediaStreamFromElement: (element: HTMLVideoElement) => void;

  constructor() {
    this.acc = null;
    this.oc = null;
    this.logLevel = 6;
    this.makeCall = function (a_targetcloudid, a_targetservice, a_callerid) {
      this.acc = new AculabCloudClient(
        a_targetcloudid,
        'acc2',
        a_callerid,
        this.logLevel,
      );
      this.oc = this.acc.makeOutgoing(a_targetservice);

      // plumb up callbacks
      this.oc.onConnecting = function (this: AculabCloudCaller) {
        if (this.onConnecting) {
          this.onConnecting();
        }
      }.bind(this);

      this.oc.onRinging = function (this: AculabCloudCaller) {
        if (this.onRinging) {
          this.onRinging();
        }
      }.bind(this);

      this.oc.onMedia = function (
        this: AculabCloudCaller,
        callObj: MediaCallObj,
      ) {
        if (this.onMedia) {
          this.onMedia(callObj);
        }
      }.bind(this);

      this.oc.onConnected = function (this: AculabCloudCaller) {
        if (this.onConnected) {
          this.onConnected();
        }
      }.bind(this);

      this.oc.onDisconnect = function (
        this: AculabCloudCaller,
        callObj: DisconnectedCallObj,
      ) {
        this.oc = null;
        this.acc = null;
        if (this.onDisconnect) {
          this.onDisconnect(callObj);
        }
      }.bind(this);
    };

    this.isSupported = function () {
      return AculabCloudClient.isSupported();
    };

    this.sendDtmf = function (dtmf) {
      if (this.oc) {
        this.oc.sendDtmf(dtmf);
      } else {
        throw 'DTMF send error - no call';
      }
    };

    this.disconnect = function () {
      if (this.oc) {
        this.oc.disconnect();
      }
    };

    this.attachMediaStreamToElement = function (element, stream) {
      if (typeof element.srcObject !== 'undefined') {
        element.srcObject = stream;
      } else {
        console.error('srcObject not found');
      }
    };

    this.detachMediaStreamFromElement = function (element) {
      if (typeof element.srcObject !== 'undefined') {
        element.srcObject = null;
      } else {
        console.error('srcObject not found');
      }
    };
  }
}
