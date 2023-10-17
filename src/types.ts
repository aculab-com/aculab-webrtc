import { RegistererRegisterOptions, RegistererState } from "sip.js";
import type { AculabCloudCall } from "./aculab-cloud-call";
import { AculabCloudIncomingCall } from "./aculab-cloud-incoming-call";
import type { AculabCloudOutgoingCall } from "./aculab-cloud-outgoing-call";
import { IncomingResponse, RequestOptions } from "sip.js/lib/core";

export type TransceiverKind = "audio" | "video";
export type Cause = 'FAILED' | 'INVALIDTOKEN' | 'DISCONNECTED' | 'NORMAL';
// export type RegStateType = "Initial" | "Registered" | "Unregistered" | "Terminated";

export interface MuteObj {
  call: AculabCloudCall;
  stream: MediaStream;
  track: any;
}

export interface CallObj {
  call: AculabCloudCall | AculabCloudOutgoingCall;
}

export interface DisconnectedCallObj extends CallObj {
  cause: string;
}

export interface MediaCallObj extends CallObj {
  stream: MediaStream;
}

export interface CallConstraints {
  audio: boolean;
  video: boolean;
}

export interface CallOptions {
  constraints: CallConstraints;
  receiveAudio: boolean;
  receiveVideo: boolean;
  codecs?: {
    audio: RTCRtpCodecCapability[];
    video: RTCRtpCodecCapability[];
  };
  maxBitrateAudio?: number;
  maxBitrateVideo?: number;
  localStream?: MediaStream;
  localStreams?: MediaStream[];
  reinvite?: boolean;
  iceRestart?: boolean;
  offerOptions?: {
    // legacy options keep for backwards compatibility
    offerToReceiveAudio: boolean;
    offerToReceiveVideo: boolean;
  };
}

export interface DtmfOptions {
  duration: number;
  interToneGap: number;
}

export interface OnIncomingObj {
  call: AculabCloudIncomingCall;
  from: string;
  type: string;
  offeringAudio: boolean;
  canReceiveAudio: boolean;
  offeringVideo: boolean;
  canReceiveVideo: boolean;
}

export interface OnIncomingStateObj {
  ready: boolean;
  cause: string;
  retry: boolean;
}

export interface StateEventEmitter {state: RegistererState, cause?: string, retry: boolean}
