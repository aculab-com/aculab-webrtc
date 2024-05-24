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
    const uri = new URI(
      'sip',
      serviceName,
      `sip-${client._cloud}.aculab.com;transport=tcp`,
    );
    super(
      client,
      uri,
      {
        earlyMedia: true,
      },
      callOptions,
      false,
      legacy_interface,
    );
  }
}
