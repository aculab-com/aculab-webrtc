# How to Write Aculab WebRTC Apps

This guide shows the basic steps needed to write WebRTC applications for Aculab Cloud. Refer to the API guide for detailed documentation on the APIs used.

WebRTC Client instances can call, and be called from, [Aculab Cloud services]( https://www.aculab.com/cloud/guides/outbound-and-inbound-services/) and other WebRTC Client instances. They cannot call PSTN or SIP phones directly, although of course Aculab Cloud services can call those devices.
Refer to [interface.md](https://github.com/aculab-com/aculab-webrtc/blob/main/interface.md) for detailed documentation on the APIs used.

## Integrating WebRTC

Include the JavaScript library by adding the [@aculab-com/aculab-webrtc](https://www.npmjs.com/package/@aculab-com/aculab-webrtc) npm package

```
yarn add @aculab-com/aculab-webrtc
```


### Video calls between WebRTC Client instances

The default behaviour of the interface is to set up audio only calls. When the call is between two WebRTC Client instances, you can enable video in both or just one direction.

To make a call with video to a WebRTC Client instance you need to pass a suitably configured AculabCloudCallOptions object to AculabCloudClient.callClient(). The constraints property of the options object is passed to the browser's getUserMedia() function. For example:
```
    var options = {
        constraints: {
            audio: true,
            video: true
        }
    };
    call = acc.callClient("other_client_id", token, options);
```
This module is used for Android and iOS app development by Aculab’s [React Native](https://github.com/aculab-com/react-native-aculab-client) package, which has a dependency on the react-native-webrtc module. This mutes video by stopping the stream, rather than sending a stream of 0's in order to shut off camera light (see https://github.com/react-native-webrtc/react-native-webrtc/issues/643).

We have implemented a workaround that makes callbacks available for local and remote video mute/unmute.  

```
    aculab_cloud_call.onLocalVideoMuteCB
    aculab_cloud_call.onLocalVideoUnMuteCB
```

The local callbacks are triggered when video is muted/unmated and can place an image in the local view of the call window.

```
    aculab_cloud_call.onRemoteVideoMuteCB
    aculab_cloud_call.onRemoteVideoUnMuteCB 
```

The remote callbacks are triggered when RTP data is detected to have started or stopped and can indicate the change in state to the user.



For incoming calls from WebRTC Client instances, you can determine the caller's media settings for the call from the object passed to the onIncoming callback. For a call with video in both directions, the offeringVideo and canReceiveVideo properties of that object will be true. To answer the call with video, you need to pass a suitably configured AculabCloudCallOptions object to AculabCloudIncomingCall.answer(). For example:
```
    var options = {
        constraints: {
            audio: true,
            video: true
        }
    };
    call.answer(options);
```

Note that calls will fail if the constraints require a local video stream but the user doesn't have a webcam, or refuses access to it. To receive video but not send it, you can use:
```
    var options = {
        constraints: {
            audio: true,
            video: false
        },
        receiveVideo: true
    };
```

## Creating a WebRTC Client Instance

To create a WebRTC Client instance, you will need the following information:


Cloud ID - [The Cloud ID]( https://www.aculab.com/cloud/guides/cloud-regions/) for your Aculab Cloud account, for example 1-2-0.
WebRTC Access Key - [The WebRTC Access Key](https://cloud.aculab.com/home/webrtcsettings) for your Aculab Cloud account.
Client Id -	A text identifier which Aculab Cloud uses to identify a specific WebRTC Client instance.

All WebRTC Client instances use the AculabCloudClient class. Create a new instance of the class with:

```
    var cloudId = "1-2-0";
    var webRtcAccessKey = "3krt4sfjo...";
    var clientId = "myClient-4369";
    var logLevel = 2;
    acc = new AculabCloudClient(cloudId, webRtcAccessKey, clientId, logLevel);
```

where logLevel is between 0 and 6 inclusive. 0 disables logging.

## Enabling Incoming Calls on a WebRTC Client Instance

If you will be accepting incoming WebRTC calls, then you need to set up the onIncoming and onIncomingState callbacks. 

```
    acc.onIncoming = newCall;
    acc.onIncomingState = incomingState;
```

See [Accepting an Incoming WebRTC Call](#accepting-an-incoming-webrtc-call) for information on the newCall and incomingState functions.

A WebRTC Client instance needs a token to be able to receive incoming WebRTC calls. This token is retrieved from the [webrtc_generate_token](https://www.aculab.com/cloud/web-services/webrtc-clients/ ) web service. It should be generated by server side code, so the client does not know your web services API access key. An example as follows:

```
    fetch('/get_webrtc_token_for_client', {
        method: 'POST',
        body: clientId
      })
      .then(response => response.json())
      .then(data => acc.enableIncoming(data.token));
```

The onIncomingState callback is used to notify you if incoming WebRTC calls are enabled or disabled.

## Calling a WebRTC Client instance from WebRTC

WebRTC Client instances can call other WebRTC Client instances. This is achieved by calling AculabCloudClient.callClient() then setting up the AculabCloudOutgoingCall callbacks to handle the call control events.

A WebRTC Client instance needs a token to be able to call another WebRTC Client instance. This token is retrieved from the [webrtc_generate_token](https://www.aculab.com/cloud/web-services/webrtc-clients/ ) web service. It should be generated by server side code, so the client does not know your web services API access key.

An AculabCloudCallOptions object can be passed to configure the media settings. For example, this can be used to make video calls by requesting access to the user's webcam.

```
    var options = { constraints: { audio: true, video: true } };
    call = acc.callClient("other_client_id", data.token, options);
    call.onDisconnect = callDisconnected;
    call.onRinging = callRinging;
    call.onMedia = gotMedia;
    call.onConnecting = connecting;
    call.onConnected = connected;
```

See [Call Control Callbacks](#call-control-callbacks) for information on these callbacks.

## Calling an Aculab Cloud Service from WebRTC

WebRTC Client instances can call Aculab Cloud inbound services. This is achieved by calling AculabCloudClient.callService() then setting up the AculabCloudOutgoingCall callbacks to handle the call control events.

```
    call = acc.callService(encodeURIComponent("incoming_service_name"));
    call.onDisconnect = callDisconnected;
    call.onRinging = callRinging;
    call.onMedia = gotMedia;
    call.onConnecting = connecting;
    call.onConnected = connected;
```

See [Call Control Callbacks](#call-control-callbacks) for information on these callbacks.

## Calling a WebRTC Client Instance from Aculab Cloud

UAS and REST applications can call a WebRTC Client instance by setting the call destination to webrtc:<clientId>.

The Caller ID specified is passed to the onIncoming callback.

## Calling a WebRTC Client Instance from the REST API Version 2.0

An example of using the Connect action to call a WebRTC Client instance, written in Python.

```
    my_connect = Connect()
    my_connect.set_next_page("/call_finished")
    my_connect.append_destination("webrtc:{0}".format(clientId))
    my_connect.set_call_from('441234567890')
    my_connect.set_hold_media(Play(file_to_play='holdmusic.wav'))
    my_connect.set_secondary_call(SecondaryCall(first_page=WebPage(url='secondary_first'),
                                                final_page=WebPage(url='secondary_final'),
                                                error_page=WebPage(url='error_page')))
```

## Calling a WebRTC Client Instance from the UAS API

A Python example of using the UASCallChannel object to call a WebRTC Client instance.

    if channel.start_call('webrtc:{0}'.format(clientId), call_from='441234567890') is True:
        # we have started an outbound call
        pass
## Accepting an Incoming WebRTC Call

### onIncomingState

onIncomingState is used to inform you whether incoming WebRTC calls are enabled or disabled.
```
    function incomingState(obj) {
        if (obj.ready) {
            // We can receive incoming calls
        } else {
            // We cannot receive incoming calls
            // Report obj.cause to the user
        }
    }
```

### onIncoming

If WebRTC Client has been configured to accept incoming calls, then the onIncoming callback is used to accept any incoming call.

The onIncoming callback should set up the AculabCloudIncomingCall callbacks, notify the user of the call, and send the ringing notification to the remote end.
```
    // newCall has been assigned to the onIncoming callback above
    function newCall(obj) {
        call = obj.call;
        callerId = obj.from;
        inbound = true;

        // Set up callbacks
        call.onDisconnect = callDisconnected;
        call.onMedia = gotMedia;
        call.onConnecting = connecting;
        call.onConnected = connected;

        // Play a ringing to notify user of the call
        // get the HTMLMediaElement element
        var player = document.getElementById('player');
        if (player.canPlayType('audio/wav')) {
            player.loop = 'loop';
            player.src = 'audio/ringing.wav';
            player.type = 'audio/wav';
            player.load();
            var p = player.play();
            if (p !== undefined) {
                p.catch(error => {
                    // Handle error
                });
            }
        } else {
            // Browser can't play audio/wav
        }

        // Send ringing notification to the caller
        call.ringing();
    }
```

See [Call Control Callbacks](#call-control-callbacks) for information on these callbacks.

### Answering the call

When the user accepts the incoming call the call's answer() function needs to be called. For calls from WebRTC Client instances, an AculabCloudCallOptions object can be passed to configure the media that is sent.

### Call Control Callbacks

The various Call Control Callbacks have been set up in the code snippets above. Example code showing how these callbacks are implemented is shown in this section.

### onDisconnect

This callback is called when the call has been disconnected. The player element should be reset, and any resources cleaned up.
```
    function callDisconnected(obj) {
        // Notify the user that the call has disconnected.

        // Stop anything that is playing
        stopPlayer();

        // reset state
        call = null;
        inbound = false;
        isconnected = false;
    }

    // Function to stop the HTMLMediaElement element playing.
    // This is used by the callDisconnected and gotMedia callbacks.
    function stopPlayer() {
        // Get the HTMLMediaElement element
        var player = document.getElementById('player');

        // Reset the player state
        player.pause();
        player.loop = '';
        player.src = '';
        player.srcObject = null;
        player.type = '';
        player.load();
        playing_ringing = false;
        gotremotestream = false;
    }
```

### onRinging

If you have not got an media stream from the remote end, then you can generate a ringtone locally.
```
    function callRinging(obj) {
        // get the HTMLMediaElement element
        var player = document.getElementById('player');
        if (!playing_ringing) {
            if (player.canPlayType('audio/wav')) {
                // Play a ringback tone if we have not got an audio stream
                // from the remote end
                // gotremotestream is initialised in gotMedia()
                if (!gotremotestream) {
                    player.loop = 'loop';
                    player.src = 'audio/ringback.wav';
                    player.type = 'audio/wav';
                    player.load();
                    var p = player.play();
                    if (p !== undefined) {
                        p.catch(error => {
                            // Handle error
                        });
                    }
                }
            } else {
                // Browser can't play audio/wav
            }
            playing_ringing = true;
        }
    }
```

### onMedia

The onMedia callback is used to give you the remote media stream which you can connect to your HTMLMediaElement element.
```
    function gotMedia(obj) {
        // Stop anything that is playing
        stopPlayer();

        var player = document.getElementById('player');
        gotremotestream = true;
        player.srcObject = obj.stream;
        player.load();
        var p = player.play();
        if (p !== undefined) {
            p.catch(error => {
                // Handle error
            });
        }
    }
```

### onConnecting

onConnecting is called when the browser has the local media stream and is preparing the sockets needed to transport the call media. There is nothing that specifically needs doing in this callback, but it can be used to connect the local media stream to show the camera view.
```
    function connecting(obj) {
        // Update a web page element to notify the user that the
        // call is connecting
    }
```

### onConnected

When the call has been answered the onConnected callback will be called. You can use this callback to notify the user about call progress.
```
    function connected(obj) {
        // Update a web page element to notify the user that the
        // call is connected
        isconnected = true;
    }
```

### Disconnecting a Call

Disconnecting a connected call is as simple as calling disconnect() on the call object. Inbound calls that have not connected should be rejected with a valid SIP cause, for example 486 busy here, instead.
```
    function stopCall() {
        if (call) {
            // If inbound call has not been accepted, then reject the call
            if (inbound && !isconnected) {
                call.reject(486);
            } else {
                call.disconnect();
            }
        }
    }
```


### Troubleshooting

A number of common issues can cause problems with media in a WebRTC call.

If the same username is registered from more than one browser instance then the most recently registered instance will receive incoming WebRTC calls. As WebRTC Client instances are automatically re-registered at various intervals, the most recently registered instance may change without warning. Therefore, in general it's best to register a given username with only one browser or application instance at a time.

On Chrome-based browsers, a page can handle a maximum total of 500 incoming/outgoing calls.  Once this limit has been reached, the page must be refreshed.  This is due to chromium bug https://issues.chromium.org/issues/41378764.
 

 

 

 

 

 

 
