"use strict";

import { AculabCloudClient } from "./aculab-cloud-client";
import { AculabCloudOutgoingServiceCall } from "./aculab-cloud-outgoing-service-call";
import { DisconnectedCallObj, MediaCallObj } from "./types";

// NB this is the old v1 api, implemented using the new api
export function AculabCloudCaller(this: any) {
	let that = this;
	let acc: AculabCloudClient | null = null;
	let oc: AculabCloudOutgoingServiceCall | null = null;

	this.logLevel = 6;
	this.iceServers = null;

	this.onDisconnect = null;
	this.onRinging = null;
	this.onMedia = null;
	this.onConnecting = null;
	this.onConnected = null;
	this.onError = null;
	this.onIncoming = null;
	this.onRegistered = null;
	this.onUnregistered = null;
	this.onRegisterFail = null;
	this.makeCall = function(a_targetcloudid: string, a_targetservice: string, a_callerid: string) {
		acc = new AculabCloudClient(a_targetcloudid, 'acc2', a_callerid, that.logLevel);
		oc = acc.makeOutgoing(a_targetservice);
		// plumb up callbacks
		oc.onConnecting = function() {
			if (that.onConnecting) {
				that.onConnecting();
			}
		};
		oc.onRinging = function() {
			if (that.onRinging) {
				that.onRinging();
			}
		};
		oc.onMedia = function(obj: MediaCallObj) {
			if (that.onMedia) {
				that.onMedia(obj);
			}
		};
		oc.onConnected = function() {
			if (that.onConnected) {
				that.onConnected();
			}
		};
		oc.onDisconnect = function(obj: DisconnectedCallObj) {
			oc = null;
			acc = null;
			if (that.onDisconnect) {
				that.onDisconnect(obj);
			}
		};
		
	};
	this.isSupported = function() {
		return AculabCloudClient.isSupported();
	}
	this.sendDtmf = function(dtmf: string) {
		if (oc) {
			oc.sendDtmf(dtmf);
		} else {
			throw 'DTMF send error - no call';
		}
	}
	
	this.disconnect = function() {
		if (oc) {
			oc.disconnect();
		}
	}
	
	this.attachMediaStreamToElement = function(element: HTMLMediaElement, stream: MediaStream) {
		if (typeof element.srcObject !== 'undefined') {
			element.srcObject = stream;
		} else {
			console.error('srcObject not found');
		}
	}
	this.detachMediaStreamFromElement = function(element: HTMLMediaElement) {
		if (typeof element.srcObject !== 'undefined') {
			element.srcObject = null;
		} else {
			console.error('srcObject not found');
		}
	}
}
