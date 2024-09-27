import type {AculabCloudClient} from './aculab-cloud-client';
import {AculabCloudOutgoingCall} from './aculab-cloud-outgoing-call';
import {URI} from 'sip.js';
import {CallOptions} from './types';

export class AculabCloudOutgoingServiceCall extends AculabCloudOutgoingCall {
  constructor(
    client: AculabCloudClient,
    serviceName: string,
    callOptions: CallOptions | undefined,
    legacy_interface: boolean = false
  ) {
    var hdrs = callOptions?.extraSipHeaders ?? [];
    hdrs.forEach((s) => {
      if (!s.startsWith("X-")) {
        throw new Error("extraSipHeader must start with 'X-'");
      }
    });

    let inv_opts = {earlyMedia: true};
    let hdr_opts = {}
    if (hdrs.length > 0) {
      hdr_opts = {extraHeaders: hdrs};
    }
    const invite_opts = {...inv_opts, ...hdr_opts};
    const uri = new URI(
      'sip',
      serviceName,
      `sip-${client._cloud}.aculab.com;transport=tcp`,
    );
    super(
      client,
      uri,
      invite_opts,
      callOptions,
      false,
      legacy_interface,
    );
  }
}
