"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AculabCloudCaller = void 0;
// import { AculabCloudCall } from "./aculab-cloud-call";
const aculab_cloud_client_1 = require("./aculab-cloud-client");
// NB this is the old v1 api, implemented using the new api
function AculabCloudCaller() {
    let that = this;
    let acc = null;
    let oc = null;
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
    this.makeCall = function (a_targetcloudid, a_targetservice, a_callerid) {
        acc = new aculab_cloud_client_1.AculabCloudClient(a_targetcloudid, 'acc2', a_callerid, that.logLevel);
        oc = acc.makeOutgoing(a_targetservice);
        // plumb up callbacks
        oc.onConnecting = function () {
            if (that.onConnecting) {
                that.onConnecting();
            }
        };
        oc.onRinging = function () {
            if (that.onRinging) {
                that.onRinging();
            }
        };
        oc.onMedia = function (obj) {
            if (that.onMedia) {
                that.onMedia(obj);
            }
        };
        oc.onConnected = function () {
            if (that.onConnected) {
                that.onConnected();
            }
        };
        oc.onDisconnect = function (obj) {
            oc = null;
            acc = null;
            if (that.onDisconnect) {
                that.onDisconnect(obj);
            }
        };
    };
    this.isSupported = function () {
        return aculab_cloud_client_1.AculabCloudClient.isSupported();
    };
    this.sendDtmf = function (dtmf) {
        if (oc) {
            oc.sendDtmf(dtmf);
        }
        else {
            throw 'DTMF send error - no call';
        }
    };
    this.disconnect = function () {
        if (oc) {
            oc.disconnect();
        }
    };
    this.attachMediaStreamToElement = function (element, stream) {
        if (typeof element.srcObject !== 'undefined') {
            element.srcObject = stream;
        }
        else {
            console.error('srcObject not found');
        }
    };
    this.detachMediaStreamFromElement = function (element) {
        if (typeof element.srcObject !== 'undefined') {
            element.srcObject = null;
        }
        else {
            console.error('srcObject not found');
        }
    };
}
exports.AculabCloudCaller = AculabCloudCaller;
