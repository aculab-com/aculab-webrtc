import {SessionDescriptionHandlerModifier, Web, Core as sipCore} from 'sip.js';
import {
  CallConstraints,
  CallOptions,
  DtmfOptions,
  TransceiverKind,
} from './types';

export class MediaEventSessionDescriptionHandler extends Web.SessionDescriptionHandler {
  options: CallOptions;
  usingOptionsLocalStream: boolean;
  acuLocalMediaStreams: MediaStream[];
  _acuRemoteMediaStreams: MediaStream[];
  _acuGUMStream: MediaStream | null;
  notified_streams: MediaStream[];
  userToInternalLocalStreamIds: Map<string, string>;
  remoteMediaStreamsToInternal: Map<string, string>;
  onUserMedia: ((stream: MediaStream) => boolean) | undefined;
  onUserMediaRemove: ((stream: MediaStream) => boolean) | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUserMediaFailed: ((error: any) => void) | undefined;

  constructor(
    logger: sipCore.Logger,
    mediaStreamFactory: Web.MediaStreamFactory,
    sessionDescriptionHandlerConfiguration: Web.SessionDescriptionHandlerConfiguration,
  ) {
    super(logger, mediaStreamFactory, sessionDescriptionHandlerConfiguration);
    this.options = {
      constraints: {audio: false, video: false},
      receiveAudio: false,
      receiveVideo: false,
    };
    this.usingOptionsLocalStream = false;
    this.acuLocalMediaStreams = [];
    this._acuRemoteMediaStreams = [];
    this._acuGUMStream = null;
    this.notified_streams = [];
    this.userToInternalLocalStreamIds = new Map();
    this.remoteMediaStreamsToInternal = new Map();
  }

  /**
   * get user stream ID
   * @param stream media stream
   * @returns user stream ID
   */
  getUserStreamId(stream: MediaStream) {
    let userStream = '';
    this.userToInternalLocalStreamIds.forEach((value, key) => {
      if (key === stream.id) {
        userStream = key;
      } else if (value === stream.id) {
        userStream = key;
      }
    });
    return userStream;
  }

  /**
   * get internal stream id.
   * @param stream media stream
   * @returns internal stream
   */
  getInternalStreamId(stream: MediaStream) {
    let internalStream = '';
    this.userToInternalLocalStreamIds.forEach((value, key) => {
      if (key === stream.id) {
        internalStream = value;
      } else if (value === stream.id) {
        internalStream = value;
      }
    });
    return internalStream;
  }

  /**
   * Add remote media to remote internal streams.
   * @param stream media stream
   * @param track media stream track
   */
  addRemoteMediaStream(stream: MediaStream, track: MediaStreamTrack) {
    let internalStreamId = this.remoteMediaStreamsToInternal.get(stream.id);

    if (!internalStreamId) {
      const newStream = stream;
      this._acuRemoteMediaStreams.push(newStream);
      this.remoteMediaStreamsToInternal.set(stream.id, newStream.id);
      internalStreamId = newStream.id;
    }

    this._acuRemoteMediaStreams.forEach(st => {
      if (st.id === internalStreamId) {
        if (!st.getTrackById(track.id)) {
          st.addTrack(track);
        }
      }
    });
  }

  /**
   * Remove remote media to remote internal streams.
   * @param track media stream track
   */
  removeRemoteMediaTrack(track: MediaStreamTrack) {
    for (let i = this._acuRemoteMediaStreams.length - 1; i >= 0; i--) {
      if (this._acuRemoteMediaStreams[i].getTrackById(track.id)) {
        this._acuRemoteMediaStreams[i].removeTrack(track);
      }
      if (this._acuRemoteMediaStreams[i].getTracks().length === 0) {
        this._acuRemoteMediaStreams.splice(i, 1);
      }
    }
  }

  /**
   * get remote media stream.
   */
  get remoteMediaStreams() {
    return this._acuRemoteMediaStreams;
  }

  /**
   * Add tract to remote stream and to session description handler.
   * @param track media stream track
   */
  setRemoteTrack(track: MediaStreamTrack) {
    this.logger.debug('SessionDescriptionHandler.setRemoteTrack');

    const remoteStream = this._remoteMediaStream;

    if (remoteStream.getTrackById(track.id)) {
      this.logger.debug(
        `SessionDescriptionHandler.setRemoteTrack - have remote ${track.kind} track`,
      );
    } else if (track.kind === 'audio') {
      this.logger.debug(
        `SessionDescriptionHandler.setRemoteTrack - adding remote ${track.kind} track`,
      );

      remoteStream.addTrack(track);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      Web.SessionDescriptionHandler['dispatchAddTrackEvent'](
        remoteStream,
        track,
      );
    } else if (track.kind === 'video') {
      this.logger.debug(
        `SessionDescriptionHandler.setRemoteTrack - adding remote ${track.kind} track`,
      );

      remoteStream.addTrack(track);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      Web.SessionDescriptionHandler['dispatchAddTrackEvent'](
        remoteStream,
        track,
      );
    }
  }

  /**
   * Set local media stream to session description handler
   * @param stream media stream
   */
  setLocalMediaStream(stream: MediaStream) {
    this.logger.debug('SessionDescriptionHandler.setLocalMediaStream');
    if (!this._peerConnection) {
      throw new Error('Peer connection undefined.');
    }
    let exists = false;
    this.logger.debug(
      'SessionDescriptionHandler.setLocalMediaStream: Finding stream ' +
        stream.id,
    );

    this.acuLocalMediaStreams.forEach(stm => {
      this.logger.debug(
        'SessionDescriptionHandler.setLocalMediaStream: Checking stream ' +
          stream.id,
      );
      if (stream.id === stm.id) {
        this.logger.debug(
          'SessionDescriptionHandler.setLocalMediaStream: Stream already exists ' +
            stream.id,
        );
        exists = true;
        // return Promise.reject();
      }
    });

    if (!exists) {
      this.acuLocalMediaStreams.push(stream);
      this.logger.debug(
        'SessionDescriptionHandler.setLocalMediaStream: Adding audio tracks ' +
          stream.id,
      );
      // update peer connection audio tracks
      stream.getAudioTracks().forEach(track => {
        this._peerConnection?.addTrack(track, stream);
        this._localMediaStream.addTrack(track);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        Web.SessionDescriptionHandler['dispatchAddTrackEvent'](stream, track); // TODO: investigate this while testing !!
      });
      this.logger.debug(
        'SessionDescriptionHandler.setLocalMediaStream: Adding video tracks ' +
          stream.id,
      );
      stream.getVideoTracks().forEach(track => {
        this._peerConnection?.addTrack(track, stream);
        this._localMediaStream.addTrack(track);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        Web.SessionDescriptionHandler['dispatchAddTrackEvent'](stream, track); // TODO: investigate this while testing !!
      });
    }

    return Promise.resolve();
  }

  /**
   * if call constrains are not valid return default call constrains.
   * @param constraints call constrains
   * @returns call constrains
   */
  checkAndDefaultConstraints(constraints: CallConstraints) {
    const defaultConstraints = {audio: true, video: true};
    constraints = constraints || defaultConstraints;
    // Empty object check
    if (
      Object.keys(constraints).length === 0 &&
      constraints.constructor === Object
    ) {
      return defaultConstraints;
    }
    return constraints;
  }

  /**
   * Send DTMF via RTP (RFC 4733)
   * @param indtmf A string containing DTMF digits
   * @param options Options object to be used by sendDtmf
   * @returns true if DTMF send is successful, false otherwise
   */
  sendDtmf(indtmf: string, options?: DtmfOptions): boolean {
    this.logger.debug('AculabCloudCall sendDtmf(' + indtmf + ')');
    if (indtmf.match(/[^0-9A-Da-d#*]/) != null) {
      throw 'Invalid DTMF string';
    }

    return super.sendDtmf(indtmf, options);
  }

  /**
   * Creates an offer or answer.
   * @param options - session description handler options.
   * @param modifiers - Modifiers.
   */
  async getDescription(
    options: Web.SessionDescriptionHandlerOptions,
    modifiers?: Array<SessionDescriptionHandlerModifier>,
  ) {
    let _a: RTCOfferOptions | undefined;
    let _b: Web.SessionDescriptionHandlerConfiguration | undefined;

    this.logger.debug('SessionDescriptionHandler.getDescription');
    if (this._peerConnection === undefined) {
      return Promise.reject(new Error('Peer connection closed.'));
    }
    // Callback on data channel creation
    this['onDataChannel'] =
      options === null || options === void 0 ? void 0 : options.onDataChannel;
    // ICE will restart upon applying an offer created with the iceRestart option
    const iceRestart =
      (_a =
        options === null || options === void 0
          ? void 0
          : (options.offerOptions as RTCOfferOptions)) === null || _a === void 0
        ? void 0
        : _a.iceRestart;
    // ICE gathering timeout may be set on a per call basis, otherwise the configured default is used
    const iceTimeout =
      (options === null || options === void 0
        ? void 0
        : options.iceGatheringTimeout) === undefined
        ? (_b = this.sessionDescriptionHandlerConfiguration) === null ||
          _b === void 0
          ? void 0
          : _b.iceGatheringTimeout
        : options === null || options === void 0
        ? void 0
        : options.iceGatheringTimeout;
    return this.getLocalMediaStreams(options)
      .then(() => this.updateDirection(options))
      .then(() => this.createDataChannel(options))
      .then(() => this.createLocalOfferOrAnswer(options))
      .then(sessionDescription =>
        this.applyModifiers(sessionDescription, modifiers),
      )
      .then(sessionDescription =>
        this.setLocalSessionDescription(sessionDescription),
      )
      .then(() => this.waitForIceGatheringComplete(iceRestart, iceTimeout))
      .then(() => this.getLocalSessionDescription())
      .then(sessionDescription => {
        return {
          body: sessionDescription.sdp,
          contentType: 'application/sdp',
        };
      })
      .catch(error => {
        this.logger.error(
          'SessionDescriptionHandler.getDescription failed - ' + error,
        );
        throw error;
      });
  }

  /**
   * get local media stream by ID
   * @param id id of a local media stream
   * @returns local media stream or null
   */
  getLocalMediaStreamById(id: string): MediaStream | null {
    let result = null;
    this.acuLocalMediaStreams.forEach(stream => {
      if (stream.id === id) {
        result = stream;
      }
    });
    return result;
  }

  /**
   * Get the first local media stream from localMediaStreams array
   * @param options call options
   * @returns local media stream or null
   */
  // @ts-expect-error overwriting - this method is incompatible with the original from SessionDescriptionHandler.
  async getLocalMediaStream(options: CallOptions) {
    const ms = await this.getLocalMediaStreams(options);
    if (ms !== null && ms.length > 0) {
      return ms[0];
    }
    return null;
  }

  /**
   * Remove local media stream from peerConnection.
   * @param stream media stream
   */
  removeLocalMediaStream(stream: MediaStream) {
    this._peerConnection?.getSenders().forEach(sender => {
      if (sender.track) {
        stream.getTracks().forEach(track => {
          if (sender.track && sender.track.id === track.id) {
            sender.track.stop();
            this._peerConnection?.removeTrack(sender);
          }
        });
      }
    });
    this.acuLocalMediaStreams = this.acuLocalMediaStreams.filter(
      s => s.id != stream.id,
    );
  }

  /**
   * Add media stream to internal local stream list.
   * @param stream media stream
   * @param do_clone shall we clone the stream in case it changes beneath us?
   * @returns internal stream ID
   */
  addStreamToInternalList(stream: MediaStream, do_clone: boolean) {
    let internalStreamId = null;
    this.userToInternalLocalStreamIds.forEach((value, key) => {
      if (key === stream.id) {
        internalStreamId = value;
      }
    });
    if (!internalStreamId) {
      let newStream = stream;
      if (do_clone && stream.clone !== undefined) {
        // Clone the stream in case it changes beneath us
        newStream = stream.clone();
      }
      internalStreamId = newStream.id;
      void this.setLocalMediaStream(newStream);
      this.userToInternalLocalStreamIds.set(stream.id, newStream.id);
    }

    return internalStreamId;
  }

  /**
   * get list of local media streams.
   * @param options call options
   * @returns local media streams
   */
  async getLocalMediaStreams(options: CallOptions) {
    if (options.constraints === undefined) {
      options = this.options;
    }
    try {
      let reinvite = false;
      if (options.reinvite !== undefined) {
        reinvite = options.reinvite;
        options.reinvite = false;
      }

      if (options.localStreams !== undefined) {
        const addedStreams: string[] = [];
        if (reinvite || !this.usingOptionsLocalStream) {
          this.usingOptionsLocalStream = true;
          options.localStreams.forEach(stream => {
            const internalStreamId = this.addStreamToInternalList(stream, true);
            if (internalStreamId !== null) {
              addedStreams.push(internalStreamId);
            }
            addedStreams.push(internalStreamId);
          });
          this.acuLocalMediaStreams.forEach(stream => {
            if (!addedStreams.includes(stream.id)) {
              let userStreamId = null;
              this.userToInternalLocalStreamIds.forEach((value, key) => {
                if (value === stream.id) {
                  userStreamId = key;
                }
              });
              if (userStreamId) {
                this.userToInternalLocalStreamIds.delete(userStreamId);
              }
              this.removeLocalMediaStream(stream);
            }
          });
          options.reinvite = false;
        }
      } else {
        if (this._acuGUMStream === null) {
          this._acuGUMStream = await navigator.mediaDevices.getUserMedia(
            options.constraints,
          );
        }
        this.addStreamToInternalList(this._acuGUMStream, false);
      }
      this.options = options;

      if (this.onUserMedia) {
        const notified_stream_ids = this.notified_streams.map(x => x.id);
        this.acuLocalMediaStreams.forEach(stream => {
          if (!notified_stream_ids.includes(stream.id)) {
            this.logger.debug(
              'SessionDescriptionHandler.getLocalMediaStreams, notifying user media',
            );
            const notified = this.onUserMedia!(stream);
            if (notified) {
              this.notified_streams.push(stream);
            }
          }
        });
      }
      if (this.onUserMediaRemove) {
        const local_stream_ids = this.acuLocalMediaStreams.map(x => x.id);
        const removed_ids: string[] = [];
        this.notified_streams.forEach(stream => {
          if (!local_stream_ids.includes(stream.id)) {
            this.logger.debug(
              'SessionDescriptionHandler.getLocalMediaStreams, notifying user media removed',
            );
            const notified = this.onUserMediaRemove!(stream);
            if (notified) {
              removed_ids.push(stream.id);
            }
          }
        });
        this.notified_streams = this.notified_streams.filter(
          stream => !removed_ids.includes(stream.id),
        );
      }
      return this.acuLocalMediaStreams;
    } catch (error) {
      if (this.onUserMediaFailed) {
        this.onUserMediaFailed(error);
      }
      throw error;
    }
  }

  /**
   * Close peer connection.
   */
  close() {
    this.logger.log('closing PeerConnection');
    // have to check signalingState since this.close() gets called multiple times
    if (
      this._peerConnection &&
      this._peerConnection.signalingState !== 'closed'
    ) {
      if (this._peerConnection.getSenders) {
        this._peerConnection.getSenders().forEach(sender => {
          if (sender.track) {
            sender.track.stop();
          }
        });
      }
      if (this._peerConnection.getReceivers) {
        this._peerConnection.getReceivers().forEach(receiver => {
          if (receiver.track) {
            receiver.track.stop();
          }
        });
      }
      this._peerConnection.close();
    }
  }

  /**
   * Depending on the current signaling state and the session hold state, update transceiver direction.
   * @param options call options
   */
  updateDirection(options: CallOptions) {
    if (this._peerConnection === undefined) {
      return Promise.reject(new Error('Peer connection closed.'));
    }

    const getTransceiverKind = (transceiver: RTCRtpTransceiver) => {
      if (transceiver.sender && transceiver.sender.track) {
        return transceiver.sender.track.kind;
      }
      if (transceiver.receiver && transceiver.receiver.track) {
        return transceiver.receiver.track.kind;
      }
      return 'unknown';
    };

    const updateTransceiverCodecsAndBitrates = (
      transceiver: RTCRtpTransceiver,
      kind: TransceiverKind,
    ) => {
      if (transceiver.setCodecPreferences && options.codecs) {
        if (kind === 'video') {
          this.logger.debug(
            'SessionDescriptionHandler.updateDirection - setting video codecs',
          );
          transceiver.setCodecPreferences(options.codecs.video);
        } else if (kind === 'audio') {
          this.logger.debug(
            'SessionDescriptionHandler.updateDirection - setting audio codecs',
          );
          transceiver.setCodecPreferences(options.codecs.audio);
        }
      }
      if (transceiver.sender) {
        let bitrate: number | undefined;

        if (kind === 'video' && options.maxBitrateVideo) {
          bitrate = options.maxBitrateVideo;
        } else if (kind === 'audio' && options.maxBitrateAudio) {
          bitrate = options.maxBitrateAudio;
        }

        if (bitrate) {
          const parameters = transceiver.sender.getParameters();

          if (!parameters.encodings) {
            parameters.encodings = [{}];
          }

          let changed = false;
          parameters.encodings.forEach(enc => {
            if (!isFinite(bitrate!) || bitrate! < 0) {
              if (Object.prototype.hasOwnProperty.call(enc, 'maxBitrate')) {
                delete enc.maxBitrate;
                changed = true;
              }
            } else if (enc.maxBitrate != bitrate) {
              enc.maxBitrate = bitrate;
              changed = true;
            }
          });

          if (changed) {
            this.logger.debug(
              'SessionDescriptionHandler.updateDirection - setting ' +
                kind +
                ' bandwidth',
            );
            transceiver.sender
              .setParameters(parameters)
              .then(() => {})
              // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
              .catch((err: any) => this.logger.error(err));
          }
        }
      }
    };
    switch (this._peerConnection.signalingState) {
      case 'stable':
        // if we are stable, assume we are creating a local offer
        this.logger.debug(
          'SessionDescriptionHandler.updateDirection - setting offer direction',
        );
        {
          // set the transceiver direction to the offer direction
          this._peerConnection.getTransceivers().forEach(transceiver => {
            if (
              transceiver.direction /* guarding, but should always be true */
            ) {
              let offerDirection: RTCRtpTransceiverDirection = 'inactive';
              const kind = getTransceiverKind(transceiver) as TransceiverKind;

              if (kind === 'video') {
                if (options.constraints?.video && options.receiveVideo) {
                  offerDirection = 'sendrecv';
                } else if (options.constraints?.video) {
                  offerDirection = 'sendonly';
                } else if (options.receiveVideo) {
                  offerDirection = 'recvonly';
                }
              } else if (kind === 'audio') {
                if (options.constraints?.audio && options.receiveAudio) {
                  offerDirection = 'sendrecv';
                } else if (options.constraints?.audio) {
                  offerDirection = 'sendonly';
                } else if (options.receiveAudio) {
                  offerDirection = 'recvonly';
                }
              }
              if (transceiver.direction !== offerDirection) {
                transceiver.direction = offerDirection;
              }
              updateTransceiverCodecsAndBitrates(transceiver, kind);
            }
          });
        }
        break;
      case 'have-remote-offer':
        // if we have a remote offer, assume we are creating a local answer
        this.logger.debug(
          'SessionDescriptionHandler.updateDirection - setting answer direction',
        );
        {
          // determine the offered direction
          const description = this._peerConnection.remoteDescription;
          if (!description) {
            throw new Error('Failed to read remote offer');
          }

          const offeredDirections =
            MediaEventSessionDescriptionHandler.get_audio_video_directions(
              description.sdp,
            );

          // set the transceiver direction to the answer direction
          this._peerConnection.getTransceivers().forEach(transceiver => {
            if (
              options.constraints !== undefined &&
              transceiver.direction /* guarding, but should always be true */ &&
              transceiver.direction !== 'stopped'
            ) {
              let answerDirection: RTCRtpTransceiverDirection = 'inactive';
              const kind = getTransceiverKind(transceiver) as TransceiverKind;
              if (transceiver.mid !== null) {
                if (kind === 'video' && offeredDirections.video) {
                  if (
                    options.constraints?.video &&
                    offeredDirections.video.includes('recv')
                  ) {
                    answerDirection = 'sendonly';
                    if (
                      options.receiveVideo &&
                      offeredDirections.video.includes('send')
                    ) {
                      answerDirection = 'sendrecv';
                    }
                  }
                }
                if (kind === 'audio' && offeredDirections.audio) {
                  if (
                    options.constraints?.audio &&
                    offeredDirections.audio.includes('recv')
                  ) {
                    answerDirection = 'sendonly';
                    if (
                      options.receiveAudio &&
                      offeredDirections.audio.includes('send')
                    ) {
                      answerDirection = 'sendrecv';
                    }
                  }
                }
              }
              if (answerDirection === 'inactive') {
                transceiver.stop();
              } else {
                if (transceiver.direction !== answerDirection) {
                  transceiver.direction = answerDirection;
                }
                updateTransceiverCodecsAndBitrates(transceiver, kind);
              }
            }
          });
        }
        break;
      case 'have-local-offer':
      case 'have-local-pranswer':
      case 'have-remote-pranswer':
      case 'closed':
      default:
        return Promise.reject(
          new Error(
            'Invalid signaling state ' + this._peerConnection.signalingState,
          ),
        );
    }
    return Promise.resolve();
  }

  /**
   * Makes sure your call options are as they should be.
   * @param options call options
   * @returns call options
   */
  static fixup_options(options?: CallOptions) {
    const defaults: CallOptions = {
      constraints: {
        audio: true,
        video: false,
      },
      receiveAudio: undefined,
      receiveVideo: undefined,
      codecs: {
        audio: [],
        video: [],
      },
      maxBitrateAudio: undefined,
      maxBitrateVideo: undefined,
      localStream: undefined,
      localStreams: undefined,
      reinvite: false,
      iceRestart: false,
    };
    const opts = {...defaults, ...options};
    if (opts.localStream) {
      // Backwards compatibility:
      // Add this to the localStreams array, and deal with it there
      opts.localStreams = [opts.localStream];
    }
    if (opts.localStreams) {
      let has_audio = false;
      let has_video = false;
      for (let i = 0; i < opts.localStreams.length; i++) {
        has_audio =
          has_audio || opts.localStreams[i].getAudioTracks().length > 0;
        has_video =
          has_video || opts.localStreams[i].getVideoTracks().length > 0;
      }
      opts.constraints!.audio = has_audio;
      opts.constraints!.video = has_video;
    }
    if (opts.receiveAudio === undefined) {
      opts.receiveAudio = opts.constraints!.audio != false;
    }
    if (opts.receiveVideo === undefined) {
      opts.receiveVideo = opts.constraints!.video != false;
    }
    if (typeof RTCRtpTransceiver === 'undefined') {
      // legacy options as transceiver not supported
      opts.offerOptions = {
        offerToReceiveAudio: opts.receiveAudio,
        offerToReceiveVideo: opts.receiveVideo,
      };
    }
    return opts;
  }

  /**
   * get audio and video directions.
   * @param sdp session description protocol
   * @returns audio/video directions object
   */
  static get_audio_video_directions(sdp: string) {
    const lines = sdp.split('\r\n');
    let sess_dir: RTCRtpTransceiverDirection | undefined;
    let aud_dir: RTCRtpTransceiverDirection | undefined;
    let vid_dir: RTCRtpTransceiverDirection | undefined;
    let in_vid_m = false;
    let in_aud_m = false;
    for (const line of lines) {
      let dir: RTCRtpTransceiverDirection | undefined;
      if (line === 'a=sendrecv') {
        dir = 'sendrecv';
      } else if (line === 'a=sendonly') {
        dir = 'sendonly';
      } else if (line === 'a=recvonly') {
        dir = 'recvonly';
      } else if (line === 'a=inactive') {
        dir = 'inactive';
      }
      if (dir) {
        if (!sess_dir) {
          sess_dir = dir;
        } else if (in_vid_m) {
          vid_dir = dir;
        } else if (in_aud_m) {
          aud_dir = dir;
        }
        // check for aud and vid being set and break early
        if (vid_dir && aud_dir) {
          break;
        }
      }
      if (line.startsWith('m=')) {
        // check for aud and vid being set and break early
        if (vid_dir && aud_dir) {
          break;
        }
        if (!sess_dir) {
          sess_dir = 'sendrecv'; // the default
        }
        if (!vid_dir && line.startsWith('m=video ')) {
          in_vid_m = true;
          vid_dir = sess_dir;
        }
        if (!aud_dir && line.startsWith('m=audio ')) {
          in_aud_m = true;
          aud_dir = sess_dir;
        }
      }
    }
    return {video: vid_dir, audio: aud_dir};
  }

  /**
   * Creates an RTCSessionDescriptionInit from an RTCSessionDescription
   * @param RTCSessionDescription  RTC session description
   * @returns type/sdp object
   */
  createRTCSessionDescriptionInit(
    RTCSessionDescription: RTCSessionDescription,
  ) {
    return {
      type: RTCSessionDescription.type,
      sdp: RTCSessionDescription.sdp,
    };
  }
}
