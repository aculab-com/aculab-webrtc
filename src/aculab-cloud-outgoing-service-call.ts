import type {AculabCloudClient} from './aculab-cloud-client';
import {AculabCloudOutgoingCall} from './aculab-cloud-outgoing-call';
import {URI} from 'sip.js';

export class AculabCloudOutgoingServiceCall extends AculabCloudOutgoingCall {
  constructor(
    client: AculabCloudClient,
    serviceName: string,
    legacy_interface: boolean = false,
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
      undefined,
      false,
      legacy_interface,
    );
  }
}
