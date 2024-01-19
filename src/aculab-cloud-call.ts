/* eslint-disable @typescript-eslint/restrict-plus-operands */
import {Invitation, SessionState} from 'sip.js';
import {MediaEventSessionDescriptionHandler} from './media-event-session-description-handler';
import {v4 as uuidV4} from 'uuid';
import type {AculabCloudClient} from './aculab-cloud-client';
import {
  CallObj,
  CallOptions,
  CandParam,
  DisconnectedCallObj,
  IsMutedResponse,
  MediaCallObj,
  MuteObj,
} from './types';
import {CallInviter} from './call-inviter';
import {AculabCloudCallStatistics} from './aculab-cloud-call-statistics';

/**
 * make address:port string from cand object
 * @param cand parameters object
 * @returns string in format address:port
 */
function _extractAddrPort(cand: CandParam) {
  let addr = 'a.b.c.d';
  let port = 'N';
  if (cand.address !== undefined && cand.port !== undefined) {
    addr = cand.address;
    port = cand.port;
  } else if (cand.ip !== undefined && cand.port !== undefined) {
    addr = cand.ip;
    port = cand.port;
  } else if (cand.ipAddress !== undefined && cand.portNumber !== undefined) {
    addr = cand.ipAddress;
    port = cand.portNumber;
  }
  return `${addr}:${port}`;
}

export class AculabCloudCall {
  client: AculabCloudClient;
  _connected: boolean;
  _notified_connected: boolean;
  _ice_connected: boolean;
  _allowed_reinvite: boolean;
  _disconnect_called: boolean;
  _termination_reason: string;
  _callUuid: string;
  _callId: string;
  _session: CallInviter | Invitation | null;
  _remote_streams: MediaStream[] | null;
  _notified_remote_streams: MediaStream[];
  _sdh_options?: CallOptions;
  _legacy_interface: boolean;
  onRinging?: (callObj: CallObj) => void;
  onLocalVideoMute?: (obj: MuteObj) => void;
  onLocalVideoUnmute?: (obj: MuteObj) => void;
  onRemoteVideoMute?: (obj: MuteObj) => void;
  onRemoteVideoUnmute?: (obj: MuteObj) => void;
  onConnecting?: (callObj: MediaCallObj) => void;
  onMedia?: (callObj: MediaCallObj) => void;
  onMediaRemove?: (callObj: MediaCallObj) => void;
  onLocalMedia?: (callObj: MediaCallObj) => void;
  onLocalMediaRemove?: (callObj: MediaCallObj) => void;
  onConnected?: (callObj: CallObj) => void;
  onDisconnect?: (callObj: DisconnectedCallObj) => void;

  constructor(
    client: AculabCloudClient,
    reinvite_possible: boolean,
    legacy_interface: boolean = false,
  ) {
    this.client = client;
    this._callId = '';
    this._session = null;
    this._connected = false;
    this._disconnect_called = false;
    this._notified_connected = false;
    this._remote_streams = null;
    this._notified_remote_streams = [];
    this._ice_connected = false;
    this._termination_reason = '';
    this._sdh_options = undefined;
    this._callUuid = uuidV4();
    this._allowed_reinvite = reinvite_possible;
    this._legacy_interface = legacy_interface;

    /*
     * In order to deal with the fact that react-native-webrtc implemented muted video by stopping the stream
     * instead of sending a stream of 0's in order to shut off camera light when on mute.  Not a proper solution
     * and bug is filed. see https://github.com/react-native-webrtc/react-native-webrtc/issues/643
     * Work around is to have callbacks for local video mute/unmute to place a picture in the local view of the
     * call window. Also remote video mute which detects when nothing is on the rtp line (not receiving RTP
     * because of above.  There are 2 callbacks for the remote side to do something when it detects the other side has
     * muted.
     */
    // this.onLocalVideoMute = () => {};
    // this.onLocalVideoUnmute = () => {};
    // this.onRemoteVideoMute = () => {};
    // this.onRemoteVideoUnmute = () => {};
  }

  /**
   * get Call uuid
   */
  get callUuid() {
    return this._callUuid;
  }

  /**
   * legacy code: get call id
   * @returns call id
   */
  callId() {
    return this._callId;
  }

  /**
   * get Call ID
   */
  get theCallId() {
    return this._callId;
  }

  // Setters for backwards compatibility
  set onLocalVideoMuteCB(func: (obj: MuteObj) => void) {
    this.onLocalVideoMute = func;
  }

  set onLocalVideoUnMuteCB(func: (obj: MuteObj) => void) {
    this.onLocalVideoUnmute = func;
  }

  set onRemoteVideoMuteCB(func: (obj: MuteObj) => void) {
    this.onRemoteVideoMute = func;
  }

  set onRemoteVideoUnMuteCB(func: (obj: MuteObj) => void) {
    this.onRemoteVideoUnmute = func;
  }

  //Functions to call the callbacks with logging around it
  private _onLocalVideoMute(obj: MuteObj) {
    if (this.onLocalVideoMute != null) {
      this.client.console_log('AculabCloudCall calling onLocalVideoMute');
      try {
        this.onLocalVideoMute(obj);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.client.console_error(
          'AculabCloudCall: Exception calling onLocalVideoMute: ' + err,
        );
      }
    }
  }

  private _onLocalVideoUnmute(obj: MuteObj) {
    if (this.onLocalVideoUnmute != null) {
      this.client.console_log('AculabCloudCall calling onLocalVideoUnmute');
      try {
        this.onLocalVideoUnmute(obj);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.client.console_error(
          'AculabCloudCall: Exception calling onLocalVideoUnmute: ' + err,
        );
      }
    }
  }

  private _onRemoteVideoMute(obj: MuteObj) {
    if (this.onRemoteVideoMute != null) {
      this.client.console_log('AculabCloudCall calling onRemoteVideoMute');
      try {
        this.onRemoteVideoMute(obj);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.client.console_error(
          'AculabCloudCall: Exception calling onRemoteVideoMute: ' + err,
        );
      }
    }
  }

  private _onRemoteVideoUnmute(obj: MuteObj) {
    if (this.onRemoteVideoUnmute != null) {
      this.client.console_log('AculabCloudCall calling onRemoteVideoUnmute');
      try {
        this.onRemoteVideoUnmute(obj);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.client.console_error(
          'AculabCloudCall: Exception calling onRemoteVideoUnmute: ' + err,
        );
      }
    }
  }

  /**
   * get human readable message from Sip code.
   * @param code SipCode
   * @returns human readable message
   */
  _get_reason_from_sip_code(code: string) {
    if (/^10[0-9]/.test(code)) {
      return ''; // a provisional result!
    }
    if (code === '487') {
      return 'NOANSWER';
    } else if (code === '486' || code === '600' || code === '603') {
      return 'BUSY';
    } else if (
      code === '404' ||
      code === '410' ||
      code === '480' ||
      code === '604'
    ) {
      return 'UNOBTAINABLE';
    } else if (/^3[0-9]%2$/.test(code)) {
      return 'MOVED';
    } else if (/^6[0-9]%2$/.test(code)) {
      return 'REJECTED';
    } else if (!/^20[0-9]/.test(code)) {
      return 'FAILED';
    }
    return 'NORMAL';
  }

  set session(invite: CallInviter | Invitation) {
    this._session = invite;
    this._callId = invite.request.callId;
    this._session.delegate = {
      onBye: bye => {
        // extract reason from BYE message
        if (this._termination_reason === '') {
          const reason_hdr = bye.request.getHeader('Reason');
          this.client.console_log(`dialog end BYE Reason ${reason_hdr}`);
          if (reason_hdr) {
            const m = reason_hdr.match(/SIP\s*;\s*cause\s*=\s*([0-9]{3})\s*;/);
            if (m) {
              const sipCode = m[1];
              this._termination_reason =
                this._get_reason_from_sip_code(sipCode);
              this.client.console_log(
                `setting termination reason - BYE - ${this._termination_reason}`,
              );
            }
          }
        }
        void bye.accept();
      },
      onSessionDescriptionHandler: (
        sdh: MediaEventSessionDescriptionHandler,
      ) => {
        this._add_media_handlers(sdh);
      },
    };
    this._session.stateChange.addListener(state => {
      if (state === SessionState.Established) {
        this._onaccepted();
      }
      if (state === SessionState.Terminated) {
        this._onterminated();
      }
    });
  }

  /**
   * Send DTMF signal
   * @param dtmf DTMF character
   */
  sendDtmf(dtmf: string) {
    this.client.console_log('AculabCloudCall sendDtmf(' + dtmf + ')');
    if (dtmf.match(/^[^0-9A-Da-d#*]+$/) != null) {
      throw 'Invalid DTMF string';
    }
    if (this._session?.sessionDescriptionHandler) {
      try {
        this._session.sessionDescriptionHandler.sendDtmf(dtmf);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.client.console_error(
          'AculabCloudCall: Exception sending DTMF: ' + err,
        );
        throw 'DTMF send error';
      }
    } else {
      throw 'DTMF send error';
    }
  }

  /**
   * Mute local/remote audio/video.
   * @param mic mute local microphone
   * @param output_audio mute audio output
   * @param camera mute local camera
   * @param output_video mute video output
   */
  mute(
    mic: boolean,
    output_audio: boolean,
    camera?: boolean,
    output_video?: boolean,
  ) {
    this.client.console_log(
      'AculabCloudCall mute(mic=' +
        mic +
        ', output_audio=' +
        output_audio +
        ', camera=' +
        camera +
        ', output_video=' +
        output_video +
        ')',
    );
    if (camera === undefined) {
      camera = mic;
    }
    if (output_video === undefined) {
      output_video = output_audio;
    }

    if (this._remote_streams) {
      this._remote_streams.forEach(stream => {
        this.muteRemoteStream(stream, output_audio, output_video!);
      });
    }

    if (this._session?.sessionDescriptionHandler) {
      (
        this._session
          .sessionDescriptionHandler as MediaEventSessionDescriptionHandler
      ).acuLocalMediaStreams.forEach((stream: MediaStream) => {
        this.muteLocalStream(stream, mic, camera!);
      });
    }
  }

  /**
   * Check mute state of components in a media stream.
   * @param stream media stream to check for muted components
   * @returns object of muted components
   */
  isMuted(stream: MediaStream): IsMutedResponse {
    const ret = {
      mic: true,
      output_audio: true,
      camera: true,
      output_video: true,
    };

    // check output
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => {
        if (track.kind === 'audio') {
          ret['output_audio'] = !track.enabled;
        } else if (track.kind === 'video') {
          ret['output_video'] = !track.enabled;
        }
      });
    }

    // check mic and camera
    const sdh = this._session
      ?.sessionDescriptionHandler as MediaEventSessionDescriptionHandler;
    if (sdh && sdh.peerConnection) {
      const pc = sdh.peerConnection;
      pc.getSenders().forEach(function (sender) {
        if (sender.track) {
          if (sender.track.kind === 'audio') {
            ret['mic'] = !sender.track.enabled;
          } else if (sender.track.kind === 'video') {
            ret['camera'] = !sender.track.enabled;
          }
        }
      });
    }
    return ret;
  }

  /**
   * Mute audio/video in a stream.
   * @param stream media stream
   * @param mic mute local microphone
   * @param output_audio mute audio output
   * @param camera mute local camera
   * @param output_video mute video output
   */
  muteStream(
    stream: MediaStream,
    mic: boolean,
    output_audio: boolean,
    camera: boolean,
    output_video: boolean,
  ) {
    this.client.console_log(
      'AculabCloudCall muteStream(mic=' +
        mic +
        ', output_audio=' +
        output_audio +
        ', camera=' +
        camera +
        ', output_video=' +
        output_video +
        ')',
    );
    if (
      this._session?.sessionDescriptionHandler &&
      (
        this._session
          .sessionDescriptionHandler as MediaEventSessionDescriptionHandler
      ).getInternalStreamId(stream)
    ) {
      this.muteLocalStream(stream, mic, camera);
    } else {
      this.muteRemoteStream(stream, output_audio, output_video);
    }
  }

  /**
   * Mute audio/video on local media stream.
   * @param stream local media stream
   * @param mic mute local microphone
   * @param camera mute local camera
   */
  muteLocalStream(stream: MediaStream, mic: boolean, camera: boolean) {
    this.client.console_log(
      'AculabCloudCall muteLocalStream(mic=' + mic + ',  camera=' + camera,
    );
    let internal_stream_id = '';
    if (this._session && this._session.sessionDescriptionHandler) {
      internal_stream_id = (
        this._session
          .sessionDescriptionHandler as MediaEventSessionDescriptionHandler
      ).getInternalStreamId(stream);
    }
    if (internal_stream_id) {
      if (
        this._session &&
        this._session.sessionDescriptionHandler &&
        (
          this._session
            .sessionDescriptionHandler as MediaEventSessionDescriptionHandler
        ).peerConnection
      ) {
        const internal_stream = (
          this._session
            .sessionDescriptionHandler as MediaEventSessionDescriptionHandler
        ).getLocalMediaStreamById(internal_stream_id);
        const pc = (
          this._session
            .sessionDescriptionHandler as MediaEventSessionDescriptionHandler
        ).peerConnection;
        if (pc) {
          pc.getSenders().forEach(sender => {
            if (sender.track?.id && internal_stream) {
              const internal_track = internal_stream.getTrackById(
                sender.track.id,
              );
              if (sender.track && internal_track) {
                if (sender.track.kind === 'audio') {
                  sender.track.enabled = !mic;
                  internal_track.enabled = !mic;
                } else if (sender.track.kind === 'video') {
                  sender.track.enabled = !camera;
                  internal_track.enabled = !camera;
                  if (sender.track.enabled) {
                    this._onLocalVideoUnmute({
                      call: this,
                      stream: internal_stream,
                      track: sender.track,
                    });
                  } else {
                    this._onLocalVideoMute({
                      call: this,
                      stream: internal_stream,
                      track: sender.track,
                    });
                  }
                }
              }
            }
          });
        }
      }
    }
  }

  /**
   * Mute audio/video on local media stream.
   * @param stream remote media stream
   * @param output_audio mute audio output
   * @param output_video mute video output
   */
  muteRemoteStream(
    stream: MediaStream,
    output_audio: boolean,
    output_video: boolean,
  ) {
    this.client.console_log(
      'AculabCloudCall muteRemoteStream(output_audio=' +
        output_audio +
        ',  output_video=' +
        output_video,
    );
    if (this._remote_streams) {
      this._remote_streams.forEach(rStream => {
        if (rStream.id === stream.id) {
          rStream.getTracks().forEach(t => {
            if (t.kind === 'audio') {
              t.enabled = !output_audio;
            } else if (t.kind == 'video') {
              t.enabled = !output_video;
            }
          });
          return;
        }
      });
    }
  }

  _onclientready() {
    // nothing to do in aculab-cloud-call class
  }

  /**
   * Call terminated logic:\
   * set _remote_streams to null, stop local tracks,
   * remove this call from client and call onDisconnected.
   */
  _onterminated() {
    this._session = null;
    const cause = this._termination_reason || 'NORMAL';
    this.client.console_log('term: ' + cause);
    this._remote_streams = null;
    if (this._sdh_options && this._sdh_options.localStream) {
      this._sdh_options.localStreams?.forEach(streams => {
        streams.getTracks().forEach(track => {
          track.stop();
        });
      });
    }
    if (this.client._removeCall(this)) {
      // was removed, so call user callback
      if (this.onDisconnect) {
        try {
          this.onDisconnect({call: this, cause: cause});
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          this.client.console_error(
            'AculabCloudCall: Exception calling onDisconnect: ' + err,
          );
        }
      }
    }
  }

  /**
   * Removes remote media streams that were not notified
   * and triggers onMediaRemove if it has been set.
   */
  private _check_notify_remove_media() {
    for (let i = this._notified_remote_streams.length - 1; i > 0; i--) {
      let found = false;
      this._remote_streams?.forEach(stream => {
        if (this._notified_remote_streams[i].id === stream.id) {
          found = true;
        }
      });
      if (!found && this.onMediaRemove) {
        this.client.console_log('AculabCloudCall calling onMediaRemove');
        try {
          this.onMediaRemove({
            call: this,
            stream: this._notified_remote_streams[i],
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.client.console_error(
            'AculabCloudCall onMediaRemove caused exception: ' + err,
          );
        }
        this._notified_remote_streams.splice(i, 1);
      }
    }
  }

  /**
   * Check all _remote_streams have been notified.
   */
  private _check_notify_media() {
    this._remote_streams?.forEach(stream => {
      this._check_notify_stream(stream);
    });
  }

  /**
   * Check if stream has been notified.\
   * if not it add stream to _notified_remote_streams,
   * sets on track onunmute and onmute and triggers onMedia.
   * @param stream media stream
   */
  private _check_notify_stream(stream: MediaStream) {
    let already_notified = false;
    this._notified_remote_streams.forEach(ns => {
      if (ns.id == stream.id) {
        already_notified = true;
      }
    });
    if (!already_notified && this._ice_connected) {
      this._notified_remote_streams.push(stream);
      try {
        //Need to do some setup of mute callbacks for remote stream
        if (stream) {
          stream.getVideoTracks().forEach(track => {
            track.onunmute = () => {
              this._onRemoteVideoUnmute({
                call: this,
                stream: stream,
                track: track,
              });
            };
            track.onmute = () => {
              this._onRemoteVideoMute({
                call: this,
                stream: stream,
                track: track,
              });
            };
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.client.console_error(
          'AculabCloudCall adding video track mute handlers caused exception: ' +
            err,
        );
      }
      this.client.console_log('AculabCloudCall calling onMedia');
      if (this.onMedia) {
        try {
          this.onMedia({call: this, stream: stream});
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          this.client.console_error(
            'AculabCloudCall onMedia caused exception: ' + err,
          );
        }
      }
    }
  }

  /**
   * triggers onConnected.
   */
  private _check_notify_connected() {
    if (this._connected && !this._notified_connected && this._ice_connected) {
      this._notified_connected = true;

      if (this.onConnected) {
        this.client.console_log(
          'AculabCloudCall calling onConnected' +
            ` ice: ${this._ice_connected}`,
        );
        try {
          this.onConnected({call: this});
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          this.client.console_error(
            'AculabCloudCall onConnected caused exception:' + err,
          );
        }
      }
    }
  }

  /**
   * handle connected
   */
  private _onaccepted() {
    this._connected = true;
    this._check_notify_connected();
  }

  /**
   * Set ice connected and notify media + connected.
   * @param connected is connected
   */
  private _set_ice_state(connected: boolean) {
    this.client.console_log(
      'AculabCloudCall set_ice_state(connected=' + connected + ')',
    );
    this._ice_connected = connected;
    this._check_notify_media();
    this._check_notify_connected();
  }

  /**
   * Add media handlers to media description session handler.
   * @param sdh media description session handler
   */
  _add_media_handlers(sdh: MediaEventSessionDescriptionHandler) {
    this.client.console_log('AculabCloudCall adding media event handlers');

    sdh.onUserMedia = (stream: MediaStream) => {
      let notified = false;
      if (this.onConnecting || this.onLocalMedia) {
        this.client.console_log('AculabCloudCall calling onConnecting');
        try {
          if (this.onLocalMedia) {
            this.onLocalMedia({call: this, stream: stream});
          } else if (this.onConnecting) {
            // Legacy callback, from when we supported only
            // one stream
            this.onConnecting({call: this, stream: stream});
          }
          notified = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          this.client.console_error(
            'AculabCloudCall onConnecting caused exception:' + err,
          );
        }
      }
      return notified;
    };

    sdh.onUserMediaRemove = (stream: MediaStream) => {
      let notified = false;
      if (this.onLocalMediaRemove) {
        this.client.console_log('AculabCloudCall calling onUserMediaRemoved');
        try {
          this.onLocalMediaRemove({call: this, stream: stream});
          notified = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          this.client.console_error(
            'AculabCloudCall onUserMediaRemoved caused exception:' + err,
          );
        }
      }
      return notified;
    };

    sdh.onUserMediaFailed = err => {
      this.client.console_error('AculabCloudCall getUserMedia failed - ' + err);
      // store error, so we can report correct reason in onDisconnect callback
      if (this._termination_reason == '') {
        if (this._legacy_interface) {
          this._termination_reason = 'MIC_ERROR';
        } else {
          this._termination_reason = 'DEVICE_ERROR';
        }
      }
    };

    sdh.peerConnectionDelegate = {
      ontrack: (ev: RTCTrackEvent) => {
        ev.streams[0].onremovetrack = ({track}) => {
          sdh.removeRemoteMediaTrack(track);
          this._remote_streams = sdh.remoteMediaStreams;
          this._check_notify_remove_media();
        };

        if (ev.track) {
          sdh.addRemoteMediaStream(ev.streams[0], ev.track);
          this._remote_streams = sdh.remoteMediaStreams;
          this._check_notify_media();
        }
      },
      onicecandidateerror: (ev: RTCPeerConnectionIceErrorEvent) => {
        // console.log('Ice candidate error ', ev);
        this.client.console_error(
          'Ice candidate error: ' + ev.errorText + ' code: ' + ev.errorCode,
        );
      },
      oniceconnectionstatechange: () => {
        this._remote_streams = sdh.remoteMediaStreams;

        const icestate = sdh.peerConnection?.iceConnectionState;
        if (icestate == 'connected' || icestate == 'completed') {
          this._set_ice_state(true);
        } else {
          this._set_ice_state(false);
        }
      },
    };
  }

  /**
   * Get connection information.
   * @returns address info or error message
   */
  getConnectionInfo(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    return new Promise(function (resolve) {
      if (
        that._session?.sessionDescriptionHandler &&
        (that._session as CallInviter).sessionDescriptionHandler?.peerConnection
      ) {
        (that._session as CallInviter).sessionDescriptionHandler?.peerConnection
          ?.getStats()
          .then((stats: RTCStatsReport) => {
            let localAddr = 'Unknown';
            let remoteAddr = 'Unknown';
            let localType = '?';
            let remoteType = '?';
            if (stats) {
              let selectedPairId = '';
              stats.forEach(stat => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (stat.type == 'transport') {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  selectedPairId = stat.selectedCandidatePairId as string;
                }
              });
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              let candidatePair = stats.get(selectedPairId);
              if (!candidatePair) {
                stats.forEach(stat => {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  if (stat.type == 'candidate-pair' && stat.selected) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    candidatePair = stat;
                  }
                });
              }
              if (candidatePair) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                const remote = stats.get(
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  candidatePair.remoteCandidateId as string,
                );
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                remoteType = remote.candidateType;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                remoteAddr = _extractAddrPort(remote);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const local = stats.get(
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  candidatePair.localCandidateId as string,
                );
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (local.relayProtocol) {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                  localType = local.relayProtocol;
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                } else if (local.protocol) {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                  localType = local.protocol;
                }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                localAddr = _extractAddrPort(local);
              }
            }
            resolve(
              localAddr +
                ' ' +
                localType +
                ' => ' +
                remoteAddr +
                ' ' +
                remoteType,
            );
          })
          .catch(() => {
            resolve('Failed to get stats');
          });
      } else {
        resolve('No peer connection');
      }
    });
  }

  /**
   * Add media stream
   * @param stream media stream to be added
   */
  addStream(stream: MediaStream) {
    if (!this._allowed_reinvite) {
      throw 'addStream not available';
    }
    this.client.console_log(
      'AculabCloudOutgoingCall addStream :' + this._session,
    );
    if (this._session && !this._disconnect_called) {
      try {
        const options = this._sdh_options;
        const internal_stream_id = (
          this._session as CallInviter
        ).sessionDescriptionHandler?.userToInternalLocalStreamIds.get(
          stream.id,
        );
        let need_adding = false;
        if (!internal_stream_id) {
          let found = false;
          options?.localStreams?.forEach(localStream => {
            if (localStream.id == stream.id) {
              found = true;
            }
          });
          if (!found) {
            need_adding = true;
          }
        }
        if (need_adding) {
          options?.localStreams?.push(stream);
          this.reinvite(options as CallOptions);
        } else {
          throw 'Stream already exists';
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.client.console_error(
          'AculabCloudCall: Exception Adding stream: ' + err,
        );
        throw 'Add stream error';
      }
    } else {
      throw 'Not connected error';
    }
  }

  /**
   * Remove media stream
   * @param stream media stream
   */
  removeStream(stream: MediaStream) {
    if (!this._allowed_reinvite) {
      throw 'removeStream not available';
    }
    this.client.console_log(
      'AculabCloudOutgoingCall removeStream :' + this._session,
    );
    if (this._session && !this._disconnect_called) {
      try {
        const options = this._sdh_options;
        const stream_id = (
          this._session as CallInviter
        ).sessionDescriptionHandler?.getUserStreamId(stream);
        if (stream_id && options) {
          options.localStreams = options?.localStreams?.filter(
            item => item.id !== stream_id,
          );
          this.reinvite(options);
        } else {
          throw 'Stream does not exist';
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.client.console_error(
          'AculabCloudCall: Exception Removing stream: ' + err,
        );
        throw 'Remove stream error';
      }
    } else {
      throw 'Not connected error';
    }
  }

  /**
   * Session reinvite.
   * @param options call options
   */
  reinvite(options: CallOptions) {
    if (!this._allowed_reinvite) {
      throw 'Reinvite not available';
    }
    if (
      options.localStreams === undefined ||
      options.localStreams.length === 0
    ) {
      throw 'At least one MediaStream needed in options.localStreams';
    }
    this.client.console_log(
      'AculabCloudOutgoingCall reinvite :' + this._session,
    );
    if (this._session && !this._disconnect_called) {
      try {
        this._sdh_options =
          MediaEventSessionDescriptionHandler.fixup_options(options);
        const opts = {
          sessionDescriptionHandlerOptions: this._sdh_options,
        };

        this._sdh_options.reinvite = true;
        this._sdh_options.iceRestart = true;
        opts.sessionDescriptionHandlerOptions = this._sdh_options;
        this.client.console_log(
          'AculabCloudCall: new constraints: ' + JSON.stringify(opts),
        );
        void this._session.invite(opts);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.client.console_error(
          'AculabCloudCall: Exception changing constraints: ' + err,
        );
        throw 'Reinvite error';
      }
    } else {
      throw 'Reinvite error';
    }
  }

  disconnect() {
    // dummy function to fix js issue when TS used.
  }

  /**
   * Get call statistics and parse them into AculabCloudCallStatistics
   * @return AculabCloudCallStatistics
   */
  async getStats(reportsToCollect?: string[]) {
    const sdh = this._session?.sessionDescriptionHandler;
    if (!sdh || !('peerConnection' in sdh)) {
      throw 'No Session Description Handler or Peer Connection';
    }

    const pc = sdh.peerConnection;
    if (!pc) {
      throw 'No peer connection available';
    }

    return new AculabCloudCallStatistics({
      reports: await pc.getStats(),
      reportsToCollect: reportsToCollect,
    });
  }
}
