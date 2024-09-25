import {RegistererState, Web} from 'sip.js';
import type {AculabCloudCall as CloudCall} from './aculab-cloud-call';
import type {AculabCloudIncomingCall as CloudIncomingCall} from './aculab-cloud-incoming-call';
import type {AculabCloudOutgoingCall as CloudOutgoingCall} from './aculab-cloud-outgoing-call';

export type TransceiverKind = 'audio' | 'video';
export type Cause = 'FAILED' | 'INVALIDTOKEN' | 'DISCONNECTED' | 'NORMAL';
export type AculabCloudCall = CloudCall;
export type AculabCloudIncomingCall = CloudIncomingCall;
export type AculabCloudOutgoingCall = CloudOutgoingCall;

export interface MuteObj {
  call: AculabCloudCall;
  stream: MediaStream;
  track: MediaStreamTrack;
}

export interface CallObj {
  call: AculabCloudCall | AculabCloudOutgoingCall | AculabCloudIncomingCall;
  call_state?: string;
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

export interface CallOptions extends Web.SessionDescriptionHandlerOptions {
  receiveAudio?: boolean;
  receiveVideo?: boolean;
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
  offerOptions?: RTCOfferOptions; // legacy options keep for backwards compatibility
  extraHeaders?: string[];
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
  cause: string | undefined;
  retry: boolean;
}

export interface StateEventEmitter {
  state: RegistererState;
  cause?: string;
  retry: boolean;
}

export interface CandParam {
  address?: string;
  port?: string;
  ip?: string;
  ipAddress?: string;
  portNumber?: string;
}

export interface IsMutedResponse {
  mic: boolean;
  output_audio: boolean;
  camera: boolean;
  output_video: boolean;
}
