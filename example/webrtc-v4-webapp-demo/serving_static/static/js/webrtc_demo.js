var acc = null; // The AculabCloudClient instance
var inbound_enabled = false; // True if we have enabled inbound calls
var customer_id = null; // The WebRTC key
var call = null; // The call object
var inbound = false; // The direction of the call
var is_connected = false; // Is the call connected?
var audio_player = null; // The HTML audio player element
var local_video_player = null; // The local video HTML player element
var remote_video_player = null; // The remote video HTML player element
var local_screenshare_player = null; // The local screenshare HTML video element
var remote_screenshare_player = null; // The remove screenshare HTML video element
var playing_ringing = false; // Are we playing the ring tone?
var have_video = false; // Are we sending video?
var local_call_mediastream = null; // The local media stream of the main call
var local_screenshare_mediastream = null; // The local media stream of the screenshare
var remote_call_mediastream = null; // The remote media stream of the main call
var remote_screenshare_mediastream = null; // The remote media stream of the screenshare

function configToCallInput(enabled) {
	document.getElementById("remote-user-id").disabled = !enabled;
	document.getElementById("remote-service").disabled = !enabled;
}

function configStartButtons(enabled) {
	document.getElementById("start_voice_button").disabled = !enabled;
	document.getElementById("start_video_button").disabled = !enabled;
	document.getElementById("start_service_voice_button").disabled = !enabled;
}

function configAcceptButtons(audio_enabled, voice_enabled) {
	document.getElementById("accept_voice_button").disabled = !audio_enabled;
	document.getElementById("accept_video_button").disabled = !voice_enabled;
}

function configScreenshareButtons(share, unshare) {
	document.getElementById("screenshare_button").disabled = !share;
	document.getElementById("unscreenshare_button").disabled = !unshare;
}

function configDtmfButtons(enabled) {
	var dtmf_table = document.getElementById('dtmf-buttons');
	var buttons = dtmf_table.getElementsByTagName('button');
	for (var i=0; i < buttons.length; i++) {
		buttons.item(i).disabled = !enabled;
	}
}

function stop_player(player) {
	// Reset the HTML player element state
	player.pause();
	player.loop = '';
	player.src = '';
	player.srcObject = null;
	player.type = '';
	player.load();
}

function removed_media(obj) {
	// A remote media stream has been removed.  We are only expecting
	// the screenshare stream to be removed
	if (obj.stream === remote_screenshare_mediastream) {
		remote_screenshare_mediastream = null;
		var player = remote_screenshare_player;
		stop_player(player);
	}
}

function got_media(obj) {
	// A new media stream from the remote end has been detected
	if (!remote_call_mediastream || obj === null) {
		// Stop any players to clean up
		for (player of [audio_player, remote_video_player, remote_screenshare_player]) {
			stop_player(player);
		}
		playing_ringing = false;
	}
	if (obj !== null) {
		if (!remote_call_mediastream) {
			// This is the first media stream from the remote
			// end.  It must be the main call stream
			remote_call_mediastream = obj.stream;
			if (have_video) {
				player = remote_video_player;
			} else {
				player = audio_player;
			}
			player.srcObject = obj.stream;
			player.load();
			var p = player.play();
			if (p !== undefined) {
				p.catch(error => {});
			}
		} else {
			// This is the second media stream from the remote end.
			// It must be the screen share stream
			remote_screenshare_mediastream = obj.stream;
			player = remote_screenshare_player;
			player.srcObject = obj.stream;
			player.load();
			var p = player.play();
			if (p !== undefined) {
				p.catch(error => {});
			}
		}
	}
}

function got_local_media(obj) {
	// A local media stream has been added to the call
	if (!local_call_mediastream) {
		// This is the first media stream added to the call.  It
		// must be the main call stream
		local_call_mediastream = obj.stream;
		document.getElementById("state").value = "Connecting";
		if (have_video == true) {
			var player = local_video_player;
			player.srcObject = obj.stream;
			player.load();
			var p = player.play();
			if (p !== undefined) {
				p.catch(error => {});
			}
		}
	} else {
		// This is the second media stream to be added to the call.
		// It must be the screen share stream
		local_screenshare_mediastream = obj.stream;
		var player = local_screenshare_player;
		player.srcObject = obj.stream;
		player.load();
		var p = player.play();
		if (p !== undefined) {
			p.catch(error => {});
		}
	}
}

function removed_local_media(obj) {
	// A media stream has been removed from the call.  We are only
	// expecting the screen share stream to be removed
	if (obj.stream.id === local_screenshare_mediastream.id) {
		var player = local_screenshare_player;
		stop_player(player);
		local_screenshare_mediastream = null;
	}
}

function handle_disconnect(cause) {
	// Reset everything so we are ready for a new call
	is_connected=false;
	if (call != null) {
		call.disconnect();
		call = null;
	}
	got_media(null);
	remote_call_mediastream = null;
	local_screenshare_mediastream = null;
	local_call_mediastream = null;
	remote_screenshare_mediastream = null;
	document.getElementById("state").value = "Idle - " + cause;
	document.getElementById("remote").value = "";
	configStartButtons(true);
	document.getElementById("stop_button").disabled = true;
	document.getElementById("mute").disabled = true;
	document.getElementById("mute").value = 'none';
	configToCallInput(true);
	configAcceptButtons(false, false);
	configDtmfButtons(false);
	configScreenshareButtons(false, false);
}

function call_disconnected(obj) {
	// The call has been disconnected.
	call = null;
	handle_disconnect(obj.cause);
	for (player of [audio_player, remote_video_player, remote_screenshare_player, local_video_player, local_screenshare_player]) {
		stop_player(player);
	}
}

function ringing() {
	// The call has gone into the ringing state.
	document.getElementById("state").value = "Ringing";
	if (!playing_ringing) {
		var player = audio_player;
		if (player.canPlayType('audio/wav')) {
			if (!remote_call_mediastream) {
				player.loop = 'loop';
				player.src = 'sounds/ringback.wav';
				player.type="audio/wav";
				player.load();
				var p = player.play();
				if (p !== undefined) {
					p.catch(error => {});
				}
			}
		} else {
			console.log("browser can't play audio/wav, so no ringing will be heard");
		}
		playing_ringing = true;
	}
}

function connected() {
	// The call is connected
	is_connected=true;
	document.getElementById("state").value = "Connected";
	configStartButtons(false);
	document.getElementById("stop_button").disabled = false;
	document.getElementById("mute").disabled = false;
	configDtmfButtons(true);
	configScreenshareButtons(true, false);
}

function handle_error(obj) {
	handle_disconnect(obj.error);
}

function mute_call() {
	// The user wants to mute the call
	if (call) {
		var sel = document.getElementById('mute').value;
		if (sel == 'all') {
			// Mute all media on all streams
			call.mute(true, true, true, true);
		} else if (sel == "mic") {
			call.muteStream(local_call_mediastream, true, false, false, false);
		} else if (sel == "speaker") {
			call.muteStream(local_call_mediastream, false, true, false, false);
		} else if (sel == "camera") {
			call.muteStream(local_call_mediastream, false, false, true, false);
		} else if (sel == "video player") {
			call.muteStream(local_call_mediastream, false, false, false, true);
		} else if (sel == "audio") {
			call.muteStream(local_call_mediastream, true, true, false, false);
		} else if (sel == "video") {
			call.muteStream(local_call_mediastream, false, false, true, true);
		} else if (sel == "screenshare" && local_screenshare_mediastream !== null) {
			call.muteStream(local_screenshare_mediastream, false, false, true, true);
		} else {
			// Unmute all media on all streams
			call.mute(false, false, false, false);
		}
	}
}

async function start_call(av, call_type) {
	// The user has asked to start a call
	// 'av' is 'video' or 'voice'
	// 'call_type' is 'service' or 'client'
	if (call) {
		// Accept an inbound call
		if (inbound && !is_connected) {
			console.log("accepting inbound");
			document.getElementById("state").value = "Accepting call";
			configStartButtons(false);
			configAcceptButtons(false, false);
			document.getElementById("stop_button").disabled = false;
			call_options = {};
			if (av == 'voice') {
				have_video = false;
			}
			call_options.constraints = {audio: true, video: have_video};
			const mediaStream = await captureUserMedia(call_options.constraints);
			call_options.localStreams = [mediaStream];
			call.answer(call_options);
		} else {
			console.log("not starting call - call in progress");
		}
	} else {
		// Staring an outbound call
		console.log("starting call");
		token = document.getElementById("token").value;
		call_options = {};
		have_video = false;
		var remote_name = "unknown";
		if (call_type == 'client') {
			if (av == 'video') {
				have_video = true;
			}
			call_options.constraints = {audio: true, video: have_video};
			const mediaStream = await captureUserMedia(call_options.constraints);
			call_options.localStreams = [mediaStream];

			user_id = document.getElementById("remote-user-id").value;
			call = acc.callClient(encodeURIComponent(user_id), token, call_options);
			remote_name = "Client: " + user_id;
		} else {
			service = document.getElementById("remote-service").value;
			call = acc.callService(encodeURIComponent(service));
			remote_name = "Service: " + service;
		}
		call.onDisconnect = call_disconnected;
		call.onRinging = ringing;
		call.onMedia = got_media;
		call.onMediaRemove = removed_media;
		call.onLocalMedia = got_local_media;
		call.onLocalMediaRemove = removed_local_media;
		call.onConnected = connected;
		inbound = false;
		document.getElementById("remote").value = remote_name;
		configToCallInput(false);
		configStartButtons(false);
		document.getElementById("stop_button").disabled = false;
	}
}

function stop_call() {
	// The user wants to end the call
	console.log("stopping call");
	if (call) {
		// if inbound and not accepted, use reject instead
		if (inbound && !is_connected) {
			call.reject(486);
		} else {
			call.disconnect();
		}
	}
	document.getElementById("stop_button").disabled = true;
	configDtmfButtons(false);
}

function send_dtmf(dtmf) {
	// The user wants to send some DTMF
	if (call) {
		console.log("send dtmf:" + dtmf);
		call.sendDtmf(dtmf);
	}
}

function new_call(obj) {
	// A new inbound call has been detected
	if (call != null) {
		// We are already in a call
		obj.call.reject(486);
		return;
	}
	if (obj.offeringVideo && obj.canReceiveVideo) {
		have_video = true;
	} else {
		have_video = false;
	}
	configStartButtons(false);
	configAcceptButtons(true, have_video);
	document.getElementById("stop_button").disabled = false;
	document.getElementById("state").value = "Incoming";
	document.getElementById("remote").value = obj.from;
	configToCallInput(false);
	call = obj.call;
	inbound = true;
	
	call.onDisconnect = call_disconnected;
	call.onRinging = ringing;
	call.onMedia = got_media;
	call.onMediaRemove = removed_media;
	call.onLocalMedia = got_local_media;
	call.onLocalMediaRemove = removed_local_media;
	call.onConnected = connected;

	var player = audio_player;
	if (player.canPlayType('audio/wav')) {
		if (!remote_call_mediastream) {
			player.loop = 'loop';
			player.src = 'sounds/ringing.wav';
			player.type="audio/wav";
			player.load();
			var p = player.play();
			if (p !== undefined) {
				p.catch(error => {});
			}
		}
	} else {
		console.log("browser can't play audio/wav, so no ringing will be heard");
	}
	call.ringing();
}

function incoming_state(state) {
	// A callback to tell the user if the WebRTC library is ready to
	// handle incoming calls
	if (state.ready) {
		document.getElementById("reg_state").value = "Incoming enabled";
	} else {
		var reg_state = "Not ready for incoming - " + state.cause;
		if (state.retry) {
			reg_state = reg_state + ' - retrying';
		}
		document.getElementById("reg_state").value = reg_state
	}
}

function register() {
	token = document.getElementById("token").value;
	if (acc) {
		try {
			acc.enableIncoming(token);
		}
		catch(err) {
			alert("Error: " + err);
			return;
		}
		document.getElementById("reg_state").value = "Enabling Incoming";
		document.getElementById("unreg_button").disabled = false;
		inbound_enabled = true;
	} else {
		document.getElementById("reg_state").value = "Client not found";
	}
}

function unregister() {
	if (acc) {
		acc.disableIncoming();
		document.getElementById("unreg_button").disabled = true;
		document.getElementById("reg_state").value = "Disabling Incoming";
		document.getElementById("token").value = "";
		inbound_enabled = false;
	} else {
		document.getElementById("reg_state").value = "No cloud client";
	}
}

function start_client(cloud, customer, user, logLevel) {
	if (acc) {
		return;
	}
	if (AculabCloudClient.isSupported()) {
		try {
			acc = new AculabCloudClient(cloud, customer, user, logLevel);
		}
		catch(err) {
			acc = null;
			alert("Error: " + err)
		}
		if (acc) {
			acc.maxConcurrent = 1;
			acc.onIncoming = new_call;
			acc.onIncomingState = incomingState;
			document.getElementById("reg_button").disabled = false;
			document.getElementById("reg_state").value = "Incoming disabled";
		} else {
			document.getElementById("reg_state").value = "Error creating cloud client";
		}
	} else {
		document.getElementById("reg_state").value = "not supported by this browser";
	}
}

function make_client() {
	cloud_obj = document.getElementById("cloud");
	cloud = cloud_obj.value
	clientId_obj = document.getElementById("clientId");
	logLevel_obj = document.getElementById("logLevel");
	start_client(cloud, customer_id, clientId_obj.value, parseInt(logLevel_obj.value));
	if (!acc) {
		return;
	}
	cloud_obj.disabled = true;
	clientId_obj.disabled = true;
	logLevel_obj.disabled = true;
	document.getElementById("create_button").disabled = true;
	document.getElementById("del_button").disabled = false;
	document.getElementById("reg_button").disabled = false;
	document.getElementById("con_state").value = "Connected";
	audio_player = document.getElementById('player');
	local_video_player = document.getElementById('local-video');
	remote_video_player = document.getElementById('remote-video');
	local_screenshare_player = document.getElementById('local-screenshare');
	remote_screenshare_player = document.getElementById('remote-screenshare');
	audio_player.load(); // do this early in response to user action to ensure we can play later
	local_video_player.load(); // do this early in response to user action to ensure we can play later
	remote_video_player.load(); // do this early in response to user action to ensure we can play later
	configStartButtons(true);
}

async function captureUserMedia(constraints) {
	const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
	return mediaStream;
}

async function captureScreen() {
	const displayMediaOptions = {
		video: {
			displaySurface: "window"
		},
		audio: false,
	};
	const screenCapture = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
	return screenCapture;
}

async function share_screen() {
	// The user wants to share their screen
	configScreenshareButtons(false, true);
	const newStream = await captureScreen();
	call.addStream(newStream);
}

function unshare_screen() {
	// The user wants to stop sharing their screen
	if (local_screenshare_mediastream) {
		configScreenshareButtons(true, false);
		call.removeStream(local_screenshare_mediastream);
	}
}

function dtor_client() {
	if (call) {
		return;
	}
	if (inbound_enabled) {
		unregister();
	}
	acc = null;
	cloud_obj = document.getElementById("cloud");
	clientId_obj = document.getElementById("clientId");
	logLevel_obj = document.getElementById("logLevel");
	cloud_obj.disabled = false;
	clientId_obj.disabled = false;
	logLevel_obj.disabled = false;
	document.getElementById("create_button").disabled = false;
	document.getElementById("del_button").disabled = true;
	document.getElementById("reg_button").disabled = true;
	document.getElementById("unreg_button").disabled = true;
	document.getElementById("con_state").value = "Not connected";
	document.getElementById('stop_button').disabled = true;
	configStartButtons(false);
}

function get_webrtc_token() {
	cloud_obj = document.getElementById("cloud");
	cloud = cloud_obj.value
	customer = customer_id;
	clientId = document.getElementById("clientId").value;

	document.getElementById("token").value = "";
	fetch("/get_webrtc_token_for_client", {
		method: "POST",
		body: clientId
	})
	.then(response => response.json())
	.then(data => document.getElementById("token").value = data.token)
	.catch(function(err) {
		console.log("Fetch problem: " + err.message);
		document.getElementById("reg_state").value = "Fetch failed. Reload page."
	});
}

function set_config(jsn) {
	customer_id = jsn.token;
	document.getElementById("cloud").value = jsn.cloud;
	document.getElementById("ttl").value = jsn.ttl;
	document.getElementById("token").value = "";
}

function get_webrtc_demo_config() {
	fetch("/get_webrtc_demo_config", {
		headers: {
			'Accept': 'application/json'
		},
		method: "GET"
	})
	.then(response => response.json())
	.then(data => set_config(data));
}
