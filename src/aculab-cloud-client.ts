'use strict';

import {
  RegistererState,
  UserAgent,
  URI,
  Web,
  LogLevel,
  Session,
  Core as sipCore,
} from 'sip.js';

import {AculabCloudIncomingCall} from './aculab-cloud-incoming-call';
import {AculabCloudOutgoingClientCall} from './aculab-cloud-outgoing-client-call';
import {MediaEventSessionDescriptionHandler} from './media-event-session-description-handler';
import {TokenRegisterer} from './token-registerer';
import {AculabCloudOutgoingServiceCall} from './aculab-cloud-outgoing-service-call';
import {CallOptions, OnIncomingObj, OnIncomingStateObj} from './types';
import {AculabCloudCall} from './aculab-cloud-call';
import {CallInvitation} from './call-invitation';

export class AculabCloudClient {
  loglevel: number;
  _cloud: string;
  _webRtcAccessKey: string;
  _clientId: string;
  _legacy_interface: boolean;
  _ua: UserAgent;
  _transport_connected: boolean;
  _token: string;
  _registerer: TokenRegisterer | null;
  _calls: Set<
    AculabCloudIncomingCall | AculabCloudOutgoingServiceCall | AculabCloudCall
  >;
  _option_request_refresh_timer: ReturnType<typeof setTimeout> | null;
  maxConcurrent: number;
  _ua_started: boolean;
  _reconnecting: boolean;
  _aculabIceServers: RTCIceServer[] | undefined;
  iceServers: RTCIceServer[] | null;
  _peerConnectionConfiguration: RTCConfiguration | null;
  onIncoming: ((onIncomingObj: OnIncomingObj) => void) | undefined;
  onIncomingState:
    | ((onIncomingStateObj: OnIncomingStateObj) => void)
    | undefined;
  _registered_token: string;
  _option_request: sipCore.OutgoingRequest | null;

  constructor(
    cloudId: string,
    webRtcAccessKey: string,
    clientId: string,
    logLevel: number,
    legacy_interface: boolean = false,
  ) {
    this.loglevel = logLevel;
    this._legacy_interface = legacy_interface;
    this._registered_token = '';

    if (this.loglevel < 0) {
      this.loglevel = 0;
    }
    this.console_log(
      "AculabCloudClient cloudId = '" +
        cloudId +
        "', webRtcAccessKey = '" +
        webRtcAccessKey +
        "', clientId = '" +
        clientId +
        "'",
    );
    if (!/^[0-9]+-[0-9]+-[0-9]+$/.test(cloudId)) {
      throw 'Invalid cloudId';
    }
    if (!/^[a-z0-9]{1,63}$/.test(webRtcAccessKey)) {
      throw 'Invalid webRtcAccessKey';
    }
    // will users include the sip: in the clientId? strip it if present
    if (clientId.startsWith('sip%3A') || clientId.startsWith('sip%3a')) {
      clientId = clientId.substring(6);
    } else if (clientId.startsWith('sip:')) {
      clientId = clientId.substring(4);
    }
    // we also strip 'webrtc:' just in case people use that!
    if (clientId.startsWith('webrtc%3A') || clientId.startsWith('webrtc%3a')) {
      clientId = clientId.substring(9);
    } else if (clientId.startsWith('webrtc:')) {
      clientId = clientId.substring(7);
    }

    // we restrict this, as the cloud back end seems to struggle with escaping
    if (!/^[A-Za-z0-9+\-_.]+$/.test(clientId)) {
      throw 'Invalid clientId';
    }

    this._cloud = cloudId;
    this._webRtcAccessKey = webRtcAccessKey;
    this._clientId = clientId;
    let ua_log_level: LogLevel = 'error';
    if (this.loglevel > 4) {
      ua_log_level = 'debug';
    } else if (this.loglevel === 4) {
      ua_log_level = 'log';
    } else if (this.loglevel === 3) {
      ua_log_level = 'warn';
    } else {
      ua_log_level = 'error';
    }
    this._ua = new UserAgent({
      uri: new URI(
        'sip',
        clientId,
        webRtcAccessKey + '.webrtc-' + cloudId + '.aculabcloud.net',
      ),
      transportOptions: {
        server: 'wss://webrtc-' + cloudId + '.aculabcloud.net/sipproxy',
        connectionTimeout: 30,
        traceSip: this.loglevel > 5,
      },
      userAgentString: 'AculabCloudClient',
      logLevel: ua_log_level,
      sessionDescriptionHandlerFactory:
        this.sessionDescriptionHandlerFactory.bind(
          this,
        ) as unknown as Web.SessionDescriptionHandlerFactory,
      sessionDescriptionHandlerFactoryOptions: {},
    });
    this._ua.delegate = {
      onConnect: () => {
        this.console_log('AculabCloudClient: websocket connected');
        this._transport_connected = true;
        if (this._token) {
          this.enableIncoming(this._token);
        }
        this._requestIceServers();
      },
      onDisconnect: err => {
        if (err) {
          this.console_log(
            `AculabCloudClient: websocket disconnected (${err.name}:${err.message})`,
          );
        } else {
          this.console_log(
            `AculabCloudClient: websocket disconnected (no error info)`,
          );
        }
        this._transport_connected = false;
        // disconnect all calls
        this._calls.forEach(call => {
          if (call._termination_reason === '') {
            call._termination_reason = 'FAILED';
          }
          call.disconnect();
        });
        // stop getting ice servers
        if (this._option_request_refresh_timer) {
          clearTimeout(this._option_request_refresh_timer);
          this._option_request_refresh_timer = null;
        }
        // queue reconnect attempt
        if (err) {
          this.reconnect();
        } else if (this._registerer) {
          // clear registration
          this._registerer.setToken('');
	};
      },
      onInvite: invitation => {
        this.console_log('invite');
        if (this._calls.size >= this.maxConcurrent) {
          this.console_log(
            'AculabCloudClient rejecting incoming, too many calls',
          );
          void invitation.reject({statusCode: 486}); // 486 = busy here
        } else {
          if (this.onIncoming) {
            const ic = new AculabCloudIncomingCall(
              this,
              invitation as unknown as CallInvitation,
            );
            const media_dirs =
              MediaEventSessionDescriptionHandler.get_audio_video_directions(
                invitation.body!,
              );
            this._calls.add(ic);
            let caller_type = 'other';

            try {
              this.console_log('AculabCloudClient calling onIncoming');
              if (
                invitation.remoteIdentity.uri.host ===
                `sip-${this._cloud}.aculab.com`
              ) {
                caller_type = 'service';
              } else if (
                invitation.remoteIdentity.uri.host ===
                `${this._webRtcAccessKey}.webrtc-${this._cloud}.aculabcloud.net`
              ) {
                caller_type = 'client';
              }
              if (media_dirs.audio || media_dirs.video) {
                let audio = '';
                let video = '';
                if (media_dirs.audio !== undefined) {
                  audio = media_dirs.audio;
                }
                if (media_dirs.video !== undefined) {
                  video = media_dirs.video;
                }
                this.onIncoming({
                  call: ic,
                  from: invitation.remoteIdentity.uri.user!,
                  type: caller_type,
                  offeringAudio: audio.includes('send'),
                  canReceiveAudio: audio.includes('recv'),
                  offeringVideo: video.includes('send'),
                  canReceiveVideo: video.includes('recv'),
                });
              } else {
                this.console_log(
                  'AculabCloudClient rejecting incoming, no media in incoming call',
                );
                ic.reject('500'); // should be a 500?
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
              this.console_error(
                'AculabCloudClient onIncoming cause exception: ' + err,
              );
              ic.reject('500'); // should be a 500?
            }
          } else {
            this.console_log(
              'AculabCloudClient rejecting incoming, no onIncoming callback defined',
            );
            void invitation.reject(); // default is 480, maybe "404 not found" as we can't alert the user
          }
        }
      },
    };
    this._calls = new Set();
    this._ua_started = false;
    this._transport_connected = false;
    this._token = '';
    this._registerer = null;
    this._aculabIceServers = undefined;
    this._option_request = null;
    this._option_request_refresh_timer = null;
    this.maxConcurrent = 1;
    this.iceServers = null;
    this._peerConnectionConfiguration = null;
    this._reconnecting = false;
  }

  /**
   * add legacy function name alias
   * @param serviceName service id to call
   * @returns aculab cloud outgoing service call
   */
  makeOutgoing = (serviceName: string) => {
    return this.callService(serviceName);
  };

  /**
   * Reconnect
   */
  reconnect() {
    if (!this._ua_started) {
      return;
    }
    if (this._reconnecting) {
      return;
    }
    this._reconnecting = true;
    setTimeout(() => {
      if (!this._ua_started) {
        this._reconnecting = false;
        return;
      }
      this._ua
        .reconnect()
        .then(() => {
          this._reconnecting = false;
        })
        .catch(() => {
          this._reconnecting = false;
          this.reconnect();
        });
    }, 1000);
  }

  /**
   * Session description handler factory
   * @param session sip season
   * @param options configuration options
   * @returns Media Event Session Description Handler
   */
  sessionDescriptionHandlerFactory(
    session: Session,
    options: Web.SessionDescriptionHandlerConfiguration,
  ) {
    // provide a media stream factory
    const mediaStreamFactory = Web.defaultMediaStreamFactory();
    // make sure we allow `0` to be passed in so timeout can be disabled
    const iceGatheringTimeout =
      (options === null || options === void 0
        ? void 0
        : options.iceGatheringTimeout) !== undefined
        ? options === null || options === void 0
          ? void 0
          : options.iceGatheringTimeout
        : 5000;
    // merge passed factory options into default session description configuration
    const sessionDescriptionHandlerConfiguration = {
      iceGatheringTimeout,
      peerConnectionConfiguration: Object.assign(
        Object.assign(
          Object.assign({}, Web.defaultPeerConnectionConfiguration()),
	    options === null || options === void 0
	      ? void 0
              : options.peerConnectionConfiguration),
          this._peerConnectionConfiguration === null || this._peerConnectionConfiguration === void 0
	    ? void 0
            : this._peerConnectionConfiguration
      )
    };
    // set the desired ice servers
    if (this._peerConnectionConfiguration?.iceServers === undefined) {
      if (this.iceServers != null) {
        // This is deprecated functionality.  iceServers should be passed into
        // setPeerConnectionConfiguration
        sessionDescriptionHandlerConfiguration.peerConnectionConfiguration.iceServers =
          this.iceServers;
      } else {
        sessionDescriptionHandlerConfiguration.peerConnectionConfiguration.iceServers =
          this._aculabIceServers;
      }
    }
    const logger = session.userAgent.getLogger('sip.SessionDescriptionHandler');
    return new MediaEventSessionDescriptionHandler(
      logger,
      mediaStreamFactory,
      sessionDescriptionHandlerConfiguration,
    );
  }

  /**
   * Returns true if client is ready to be used.
   * @returns client is ready true/false
   */
  _isReady() {
    if (
      this._transport_connected &&
      (this.iceServers != null || this._aculabIceServers != null)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Request Ice Servers
   */
  _requestIceServers() {
    if (!this._ua_started || !this._transport_connected) {
      return;
    }
    if (this._option_request_refresh_timer) {
      clearTimeout(this._option_request_refresh_timer);
      this._option_request_refresh_timer = null;
    }
    const request_uri = new URI(
      'sip',
      '',
      `webrtc-${this._cloud}.aculabcloud.net`,
    );

    const to_uri = request_uri;
    const from_uri = this._ua.configuration.uri;
    const core = this._ua.userAgentCore;
    const options = {};
    const message = core.makeOutgoingRequestMessage(
      'OPTIONS',
      request_uri,
      from_uri,
      to_uri,
      options,
      ['X-AculabTurnRequest: 1'],
    );
    // Send message
    this._option_request = core.request(message, {
      onAccept: response => {
        this.console_log(
          'AculabCloudClient: OPTIONS body:' + response.message.body,
        );
        const turn_str = response.message.body;
        try {
          this._aculabIceServers = JSON.parse(turn_str) as RTCIceServer[];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          this.console_error(
            'AculabCloudClient: failed to parse iceServers response: ' + err,
          );
          this._aculabIceServers = undefined;
        }
        this._option_request = null; // done with this one
        this._option_request_refresh_timer = setTimeout(() => {
          this._option_request_refresh_timer = null;
          this._requestIceServers();
        }, 30000); // once a minute should be ok, they are valid for 2
        if (this._aculabIceServers) {
          // trigger any calls waiting to start
          this._calls.forEach(function (call) {
            call._onclientready();
          });
        }
      },
      onReject: response => {
        this.console_log(
          `AculabCloudClient: OPTIONS failed (${response.message.statusCode} ${response.message.reasonPhrase})`,
        );
        this._aculabIceServers = undefined;
        this._option_request = null; // done with this one
        this._option_request_refresh_timer = setTimeout(() => {
          this._option_request_refresh_timer = null;
          this._requestIceServers();
        }, 60000); // once a minute should be ok, they are valid for 2
      },
    });
  }

  /**
   * Console log
   * @param msg message
   */
  console_log(msg: string) {
    if (this.loglevel > 1) {
      console.log(msg);
    }
  }

  /**
   * Console error
   * @param msg message
   */
  console_error(msg: string) {
    if (this.loglevel > 0) {
      console.error(msg);
    }
  }

  /**
   * Stop checking
   */
  private _checkStop() {
    if (
      this._calls.size === 0 &&
      this._token === '' &&
      this._registered_token === ''
    ) {
      if (this._transport_connected) {
        // no longer need websocket connection
        void this._ua.stop();
      }
      this._ua_started = false;
      // the ua will disconnect the transport, but we don't get the event
      // so just clear the flag
      this._transport_connected = false;
    }
  }

  /**
   * Remove call from calls
   * @param call call to be removed
   * @returns was call removed? true/false
   */
  _removeCall(
    call:
      | AculabCloudIncomingCall
      | AculabCloudOutgoingServiceCall
      | AculabCloudCall,
  ) {
    if (this._calls.delete(call)) {
      // was still present
      this._checkStop();
      return true;
    }
    return false; // already gone
  }

  /**
   * Create a service call
   * @param serviceName service id to be called
   * @returns Aculab Cloud Outgoing Service Call
   */
  callService(serviceName: string, options: CallOptions | undefined = undefined) {
    // some users are including the sip: in the service name, strip it
    if (serviceName.startsWith('sip%3A') || serviceName.startsWith('sip%3a')) {
      serviceName = serviceName.substring(6);
    } else if (serviceName.startsWith('sip:')) {
      serviceName = serviceName.substring(4);
    }
    // service names are more restrictive than plain SIP usernames
    if (!/^[A-Za-z0-9\-_.+]+$/.test(serviceName)) {
      throw 'Invalid serviceName';
    }
    if (this._calls.size >= this.maxConcurrent) {
      throw 'Too many calls';
    }
    if (!this._ua_started) {
      void this._ua.start();
      this._ua_started = true;
    }
    const outcall = new AculabCloudOutgoingServiceCall(
      this,
      serviceName,
      options,
      this._legacy_interface
    );
    this._calls.add(outcall);
    return outcall;
  }

  /**
   * Create a client call
   * @param clientId client id to be called
   * @param token webrtc token
   * @param options call options
   * @returns Aculab Cloud Outgoing Client Call
   */
  callClient(clientId: string, token: string, options: CallOptions) {
    if (typeof clientId !== 'string') {
      throw 'clientId is not a string';
    }
    // some users are including the sip: in the service name, strip it
    if (clientId.startsWith('sip%3A')) {
      clientId = clientId.substring(6);
    } else if (clientId.startsWith('sip:')) {
      clientId = clientId.substring(4);
    }
    // service names are more restrictive than plain SIP usernames
    const testServiceName = clientId.replace(/([A-Za-z0-9-_.+])/g, '');
    if (testServiceName !== '' || clientId === '') {
      throw 'Invalid clientId';
    }
    if (this._calls.size >= this.maxConcurrent) {
      throw 'Too many calls';
    }
    if (!this._ua_started) {
      void this._ua.start();
      this._ua_started = true;
    }
    // check token looks plausible
    const token_bits = token.split('.');
    if (token_bits.length != 3 && token_bits.length != 5) {
      // 3 for just signed, 5 for encrypted and signed
      throw 'Invalid token';
    }
    const b64u_re = RegExp('^[-_0-9a-zA-Z]+$');
    token_bits.forEach(bit => {
      if (!b64u_re.test(bit)) {
        throw 'Invalid token';
      }
    });
    const outcall = new AculabCloudOutgoingClientCall(
      this,
      clientId,
      token,
      options,
    );
    this._calls.add(outcall);
    return outcall;
  }

  /**
   * Enable incoming call and refresh client with new webrtc token.\
   * If you want to refresh client with new webrtc token use this function.
   * @param token webrtc token
   */
  enableIncoming(token: string) {
    // check token looks plausible
    const token_bits = token.split('.');
    if (token_bits.length != 3 && token_bits.length != 5) {
      // 3 for just signed, 5 for encrypted and signed
      throw 'Invalid token';
    }
    const b64u_re = RegExp('^[-_0-9a-zA-Z]+$');
    token_bits.forEach(bit => {
      if (!b64u_re.test(bit)) {
        throw 'Invalid token';
      }
    });
    this._token = token;
    if (!this._ua_started) {
      void this._ua.start();
      this._ua_started = true;
    }
    if (!this._registerer) {
      this._registerer = new TokenRegisterer(this._ua);
      this._registerer.stateChange.addListener(update => {
        if (update.state === RegistererState.Terminated) {
          return;
        }
        const ready = update.state === RegistererState.Registered;
        if (this.onIncomingState) {
          const retry =
            update.retry ||
            ((this._ua_started &&
              this._token &&
              !this._transport_connected) as boolean);
          this.console_log(
            `AculabCloudCaller calling onIncomingState(${ready}, ${update.cause}, ${retry})`,
          );
          try {
            this.onIncomingState({
              ready: ready,
              cause: update.cause,
              retry: retry,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (err: any) {
            this.console_error(
              `AculabCloudCaller onIncomingState(${ready}, ${update.cause}, ${retry}) caused exception: ${err}`,
            );
          }
        }
        if (!ready && this._token !== '' && this._registerer) {
          this._token = '';
          void this._registerer.dispose();
          this._registerer = null;
          this._checkStop();
        }
      });
    }
    if (this._transport_connected) {
      this._registerer.setToken(this._token);
    }
  }

  /**
   * Disable incoming calls
   */
  disableIncoming() {
    this._token = '';
    if (this._registerer) {
      void this._registerer.dispose();
      this._registerer = null;
    }
    this._checkStop();
  }

  /**
   * Close connection
   */
  closeConnection() {
    this.disableIncoming();
    if (this._transport_connected) {
      this._ua.transport.disconnect();
      this._transport_connected = false;
    }
  }

  /**
   * Sets the RTCPeerConnection configuration
   */
  setPeerConnectionConfiguration(configuration: object) {
    const defaults = {
      iceServers: undefined
    };
    let conf = {...defaults, ...configuration};
    this._peerConnectionConfiguration = conf;
  }
  /**
   * Check is WebRTC client supported.
   * @returns true if WebRTC client is supported.
   */
  static isSupported() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }
    if (!window.WebSocket) {
      return false;
    }
    if (!window.RTCPeerConnection) {
      return false;
    }
    return true;
  }

  /**
   * get supported codecs
   * @param mediaType codecs type
   * @returns codecs list
   */
  static getCodecList(mediaType: 'audio' | 'video') {
    if (
      window.RTCRtpTransceiver &&
      'setCodecPreferences' in window.RTCRtpTransceiver.prototype
    ) {
      const codecs = RTCRtpReceiver.getCapabilities(mediaType)?.codecs;
      return codecs;
    }
    return [];
  }
}
