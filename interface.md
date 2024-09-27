_aculab-webrtc javascript interface_
====================================

AculabCloudClient
=================

Constructor
-----------

### AculabCloudClient(cloudId, webRtcAccessKey, clientId, logLevel)

Creates an AculabCloudClient object. A page can have more than one AculabCloudClient at a time.  
`cloudId` is the identifier of the Aculab Cloud where services that interact with the user are located.  
`webRtcAccessKey` is the WebRTC access key of your Aculab Cloud account.  
`clientId` identifies this client object. It is the value that will be placed in the call_from field in the call details of the application's main channel when making calls to inbound services. It is also the value used when services make outbound calls to WebRTC clients.  
_Note: `clientId` can only contain alphanumeric and +-.\_ characters._  
`logLevel` is a numeric value between 0 and 6 inclusive. 0 disables logging and 6 is the most detailed logging.

AculabCloudClient object functions
----------------------------------

### static boolean isSupported()

Returns true if the browser supports the necessary functionality and false if not.

### static array getCodecList(mediaType)

`mediaType` is either `"audio"` or `"video"`.  
Returns an array of RTCRtpCodecCapability objects, if the browser supports the necessary functionality and an empty array if not. The list can be reordered to set a preferred codec and passed in an AculabCloudCallOptions object when placing or answering calls. (Note: removing items from the list is allowed but may cause inter-operability problems.)

### AculabCloudOutgoingCall callService(serviceName, options)

`serviceName` is the name of the Aculab Cloud incoming service that the call will be connected to.
`options`, when specified, is an AculabCloudCallOptions object.

This initiates a call to the specified Aculab Cloud incoming service. Call progress is reported by callbacks, these should be set on the object returned by this function.

This throws a string exception if:

* the browser doesn't support calling the cloud
* there are too many calls already in progress
* serviceName contains disallowed characters

### AculabCloudOutgoingCall makeOutgoing(serviceName)

_Deprecated_ This is an alias for `callService`, which should be used instead.

### AculabCloudOutgoingCall callClient(clientId, token, options)

`clientId` is the client identifier of the WebRTC client that the call will be connected to.  
`token` is an authenication token. These can be obtained using an Aculab Cloud webservice.  
`options`, when specified, is an AculabCloudCallOptions object.

This initiates a call to the specified Aculab Cloud WebRTC client. Call progress is reported by callbacks, these should be set on the object returned by this function.

This throws a string exception if:

* the browser doesn't support calling the cloud
* there are too many calls already in progress
* clientId contains disallowed characters
* token is format is invalid

### void enableIncoming(token)

`token` is an authenication token. These can be obtained using an Aculab Cloud webservice. The token can be updated by calling this function with the new token.  
This function initiates registration of this client object as the destination for calls to the specified user. The status of the registration is reported by the onIncomingState callback.

This throws a string exception if the token format is invalid.

### void disableIncoming()

This function initiates the removal of this client as the destination for call to the specified user. The status of the registration is reported by the onIncomingState callback.

### void setPeerConnectionConfiguration(configuration)

This function allows the user to set various settings in the PeerConnectionConfiguration object.  It can be useful if an ISP or router is filtering RTP traffic preventing media from being connected. It can be called at any time. Outgoing calls will use the value set when the call is made. Incoming calls will use the value set when the call is answered.

The parameter object can have the following properties which are all optional:

| property | value |
| --- | --- |
| `iceServers` | an array of RTCIceServer objects. Incoming calls will use the value set when the call is answered. If the value is null, or the property is missing, an Aculab provided set of iceServers is used. Using an empty array will disable the Aculab provided iceServers. |
| `iceTransportPolicy` | a string representing the ICE Transport Policy.  Must be one of "all" (all ICE candidates will be considered) or "relay" (only ICE candidates whose IP addresses are being relayed, such as those being passed through a TURN server, will be considered).  If this property is missing, then the default of "all" will be used. |

In normal operation, iceTransportPolicy should not be set. It can be useful as a diagnostic option to help identify firewall or connectivity issues, but relying on this could result in higher latency.

AculabCloudClient data properties
---------------------------------

### iceServers

Must be null or an array of RTCIceServer objects. This value can be changed at any time. Outgoing calls will use the value set when the call is made. Incoming calls will use the value set when the call is answered. If the value is null, an Aculab provided set of iceServers is used. Using an empty array will disable the Aculab provided iceServers.

This is deprecated in favour of setting the iceServers in setPeerConnectionConfiguration().

### maxConcurrent

This is the number of concurrent calls this client is allowed to handle. The default is 1. This value must be 1 or greater. The upper limit is browser dependent.

AculabCloudClient callback properties
-------------------------------------

Each of these callback properties must be either `null` or a function. The function will be passed a single object parameter. Additional information may be included as properties of that object. All such properties are detailed below.

### onIncomingState

Called when user registration state changes.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `ready` | A boolean indicating whether this client is waiting for incoming calls. |
| `cause` | One of the following strings:<dl><dt>'DISCONNECTED'</dt><dd>the connection to the cloud has been lost.</dd><dt>'INVALIDTOKEN'</dt><dd>the token specified is not valid (for example, it has expired)</dd><dt>'FAILED'</dt><dd>the registration was unsuccessful for some other reason</dd><dt>'NORMAL'</dt><dd>the state change was in response to API calls</dd></dl> |
| `retry` | A boolean indicating whether the client will automatically retry the registration. |

### onIncoming

Called when an incoming call occurs. If this is null or throws an exception, the incoming call is rejected.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | An AculabCloudIncomingCall object. |
| `from` | The CallerID passed by the remote party. |
| `type` | The type of the remote party. One of "client", "service" or "other". |
| `offeringAudio` | The remote party is offering to send audio. |
| `canReceiveAudio` | The remote party can receive audio. |
| `offeringVideo` | The remote party is offering to send video. |
| `canReceiveVideo` | The remote party can receive video. |

Call progress is reported by callbacks, these should be set on the passed call object before returning from the callback function.

AculabCloudCallOptions
======================

This object is used to modify the default behaviour of the client when making or answering calls.

AculabCloudCallOptions object properties
----------------------------------------

### localStream

A MediaStream object that is the local media to send to calls. If localStream and localStreams are undefined, a media stream is obtained using getUserMedia() and the specified constraints.

The stream will be cloned, and the cloned stream will be returned in the onLocalMedia callback.

### localStreams

An array of MediaStream objects that is the local media to send to calls. If localStream and localStreams are undefined, a media stream is obtained using getUserMedia() and the specified constraints.

The streams will be cloned, and the cloned streams will be returned in the onLocalMedia callback.

### constraints

A MediaStreamConstraints object. The default is `"{ audio: true, video: false }"`. This is unused if a localStream has been given.

### receiveAudio

Can be true, false or undefined. When undefined the client will receive audio if the localStream has an audio track and refuse to receive audio otherwise. The default is undefined.

### receiveVideo

Can be true, false or undefined. When undefined the client will receive video if the localStream has a video track and refuse to receive video otherwise. The default is undefined.

### codecs

An object with the following properties:

|     |     |
| --- | --- |
| `audio` | An array of RTCRtpCodecCapability, such as that returned by AculabCloudClient.getCodecList("audio"). The default is an empty array, which results in using the browser defaults. |
| `video` | An array of RTCRtpCodecCapability, such as that returned by AculabCloudClient.getCodecList("video"). The default is an empty array, which results in using the browser defaults. |

### maxBitrateAudio

The maximum bitrate to use for audio. Set to Infinte to have no limit, undefined to use the browser default, or an integer which is in bits per second.

### maxBitrateVideo

The maximum bitrate to use for video. Set to Infinte to have no limit, undefined to use the browser default, or an integer which is in bits per second.

### extraSipHeaders

An array of extra SIP Headers to set in the call. Each element in the array is a string in the form <header_name>:<value>. Each header_name must start with "X-". The extra SIP Headers will be sent when this field is set when calling callClient(), callService() and answer().

AculabCloudCall
===============

The base class for call objects. Instances derived from this object are returned by callService(), callClient() or passed to the onIncoming callback.

AculabCloudCall object functions
--------------------------------

### string callId()

Gets the callId used for the call. For outgoing calls this may return `undefined` until the onConnecting() callback is being called. For incoming calls it is always available.

### string theCallId()

Object property. Gets the callId used for the call. For outgoing calls this may return `undefined` until the onConnecting() callback is being called. For incoming calls it is always available.

### string callUuid()

Object property. Gets the callUuid used for the call.

### void mute(mic, outputAudio, camera, outputVideo)

Mute all media streams in a call.

`mic`, `outputAudio`, `camera` and `outputVideo` are boolean. If `mic` is true, then the microphone (sent audio) is muted. If `outputAudio` is true the received audio is muted. If `camera` is true, then the video stream being sent has every frame filled entirely with black pixels. If `outputVideo` is true, then the video stream being received has every frame filled entirely with black pixels. If `camera` or `outputVideo` are undefined, then the value is replaced by `mic` and `outputAudio` respectively.

### void muteLocalStream(stream, mic, camera)

Mutes a specific local media stream in a call.  The stream should be a stream the was obtained from the onLocalMedia callback.

`mic` and `camera` are boolean. If `mic` is true, then the microphone (sent audio) is muted. If `camera` is true, then the video stream being sent has every frame filled entirely with black pixels. If `camera` is undefined, then the value is replaced by `mic`.

### void muteRemoteStream(stream, output_audio, output_video)

Mutes a specific remote media stream in a call.

`outputAudio` and `outputVideo` are boolean. If `outputAudio` is true the received audio is muted. If `outputVideo` is true, then the video stream being received has every frame filled entirely with black pixels. If `outputVideo` is undefined, then the value is replaced by `outputAudio`.

### addStream(stream)

`stream` is a MediaStream. Adds a local media stream to the call. Supported on Client calls only.

This throws a string exception if:

* this is a call to a service
* the stream is already a local stream
* the call is not connected

### removeStream(stream)

`stream` is a MediaStream. Removes a local media stream from the call. It should be a stream that was obtained from the onLocalMedia callback. Supported on Client calls only.

This throws a string exception if:

* this is a call to a service
* the stream is not a local stream
* there is currently only one stream active

### void sendDtmf(dtmf_str)

`dtmf_str` is a string containing the DTMF digits to be sent. These are 0,1,2,3,4,5,6,7,8,9,*,#,A,B,C and D.

This throws a string exception if there is an invalid digit in the string. There is no return value.

### void disconnect()

Disconnects any existing call. This can be called at any time.

### getSipHeaders(name)

Gets a SIP Header with header name `name` from the call. Incoming calls can call this function any time. Outgoing calls will only return valid data if the call is in the connected state.

Returns an array of strings containing the values associated with the header name.

AculabCloudCall data properties
---------------------------------

### callUuid *(get only)*

A string representation of a locally assigned version 4 UUID. This is assigned when the call object is created and does not change.


AculabCloudCall callback properties
-----------------------------------

Each of these callback properties must be either `null` or a function. The function will be passed a single object parameter. Additional information may be included as properties of that object. All such properties are detailed below.

### onDisconnect

The call has disconnected.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | The call object that is reporting the event. |
| `cause` | One of the following strings:<dl><dt>'DEVICE_ERROR'</dt><dd>A microphone or camera has been requested but cannot be detected by the AculabCloudClient, usually because the user refused access or there is no microphone or camera.</dd><dt>'BUSY'</dt><dd>the service called hangup() with the busy cause or the service could not be started (due to limited UAS capacity, for example)</dd><dt>'UNOBTAINABLE'</dt><dd>the specified incoming service name does not exist</dd><dt>'MOVED'</dt><dd>the service attempted to redirect the call</dd><dt>'REJECTED'</dt><dd>the call was rejected either by the incoming service or an intermediary</dd><dt>'NOANSWER'</dt><dd>the call did not connect</dd><dt>'FAILED'</dt><dd>the call was unsuccessful for some other reason</dd><dt>'ERROR'</dt><dd>an internal error occurred.</dd><dt>'NORMAL'</dt><dd>the call has disconnected in the normal way after having connected</dd></dl> |

### onMedia

Called when remote media is available to be rendered to the user.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | The call object that is reporting the event. |
| `stream` | A MediaStream object suitable connecting to an `<audio>` or a `<video>` HTMLMediaElement as the `srcObject`. |

### onMediaRemove

Called when a remote media stream has been removed from the call.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | The call object that is reporting the event. |
| `stream` | A MediaStream object that should be removed from an `<audio>` or a `<video>` HTMLMediaElement as the `srcObject`. |

### onLocalMedia

Called once the local media has been obtained and the browser will now start to prepare the sockets needed to transport the call media. The passed stream is the local media.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | The call object that is reporting the event. |
| `stream` | A MediaStream object suitable connecting to an `<audio>` or a `<video>` HTMLMediaElement as the `srcObject`. |

### onLocalMediaRemove

Called when a local media stream has been removed from the call.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | The call object that is reporting the event. |
| `stream` | A MediaStream object that should be removed from an `<audio>` or a `<video>` HTMLMediaElement as the `srcObject`. |

### onConnecting

Called once the local media has been obtained and the browser will now start to prepare the sockets needed to transport the call media. The passed stream is the local media.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | The call object that is reporting the event. |
| `stream` | A MediaStream object suitable connecting to an `<audio>` or a `<video>` HTMLMediaElement as the `srcObject`. |

This is deprecated in favour of onLocalMedia.

### onConnected

Called when the call has been answered.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | The call object that is reporting the event. |

### onLocalVideoMute

Called when the call's local video track has been muted.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | The call object that is reporting the event. |
| `stream` | A MediaStream object that is the local media stream. |
| `track` | A MediaStreamTrack object that is the muted local media track. |

### onLocalVideoUnmute

Called when the call's local video track has been unmuted.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | The call object that is reporting the event. |
| `stream` | A MediaStream object that is the local media stream. |
| `track` | A MediaStreamTrack object that is the unmuted local media track. |

### onRemoteVideoMute

Called when the call's remote video track has been muted.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | The call object that is reporting the event. |
| `stream` | A MediaStream object that is the remote media stream. |
| `track` | A MediaStreamTrack object that is the muted remote media track. |

### onRemoteVideoUnmute

Called when the call's remote video track has been unmuted.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | The call object that is reporting the event. |
| `stream` | A MediaStream object that is the remote media stream. |
| `track` | A MediaStreamTrack object that is the unmuted remote media track. |

AculabCloudOutgoingCall extends AculabCloudCall
===============================================

The class for outgoing call objects as returned by callService() and callClient(). No additional functions are defined.

AculabCloudOutgoingCall callback properties
-------------------------------------------

Each of these callback properties must be either `null` or a function. The function will be passed a single object parameter. Additional information may be included as properties of that object. All such properties are detailed below.

### onRinging

The incoming service has signalled that the call is ringing.

The parameter object will have the following properties:

| property | value |
| --- | --- |
| `call` | The call object that is reporting the event. |

AculabCloudIncomingCall extends AculabCloudCall
===============================================

The class for incoming call objects passed to the onIncoming callback. No additional callbacks are defined.

AculabCloudIncomingCall object functions
----------------------------------------

### void answer(options)

`options`, when specified, is an AculabCloudCallOptions object.

Answer the incoming call.

### void ringing()

Notify the calling service that the user is being alerted to the incoming call.

### void reject(cause)

Reject the incoming call with the `cause` value specified. The value should be a SIP response code between 400 and 699 inclusive. If no cause is given or the specified cause is invalid, the cause 486 (Busy Here) will be used.
