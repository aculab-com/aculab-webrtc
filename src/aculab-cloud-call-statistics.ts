type Report = {[key: string]: unknown};
type RTCReportKind = 'audio' | 'video';

export class AculabCloudCallStatistics {
  private _reports: RTCStatsReport;
  private _reportsById: Map<string, Report[]>;
  private _localTrackIdentifiers: Map<string, string>;
  private _inboundReportsByKind: Map<RTCReportKind, Report>;
  private _outboundReportsByKind: Map<RTCReportKind, Report>;
  private _possibleKinds: RTCReportKind[] = ['audio', 'video'];
  private _reportsToCollect = ['inbound-rtp', 'media-source', 'outbound-rtp'];

  constructor({
    reports,
    reportsToCollect,
  }: {
    reports: RTCStatsReport;
    reportsToCollect?: string[];
  }) {
    this._reports = reports || new Map();
    this._reportsById = new Map();
    this._inboundReportsByKind = new Map();
    this._outboundReportsByKind = new Map();
    this._localTrackIdentifiers = new Map();

    if (reportsToCollect !== undefined) {
      this._reportsToCollect = reportsToCollect;
    }

    this.parseReports();
  }

  /**
   * get all unfiltered reports
   */
  get reports() {
    return this._reports;
  }

  /**
   * get all of the filtered reports, organized by their ID
   */
  get reportsById() {
    return this._reportsById;
  }

  /**
   * get all of the inbound-rtp reports, organized by their Kind
   */
  get inboundReportsByKind() {
    return this._inboundReportsByKind;
  }

  /**
   * get all of the outbound-rtp reports, organized by their Kind
   */
  get outboundReportsByKind() {
    return this._outboundReportsByKind;
  }

  /**
   * Parse all of the reports based upon _reportsToCollect
   */
  private parseReports() {
    let unsortedReports: Report[] = [];
    this._reports.forEach(report => {
      if (typeof report.type !== 'string') return;
      if (!this._reportsToCollect.includes(report.type)) {
        console.debug(
          `${report.type} isn't a valid report type, skipping report...`,
        );
        return;
      }

      if (
        !report.trackIdentifier ||
        typeof report.trackIdentifier !== 'string'
      ) {
        if (typeof report.mediaSourceId !== 'string') {
          console.debug(`No valid report ids where found, skipping report`);
          return;
        }

        const trackID = this._localTrackIdentifiers.get(report.mediaSourceId);

        if (!trackID) {
          console.log(
            'Track ID hasn`t been found yet adding report to unsortedReports queue',
          );
          unsortedReports.push(report);
          return;
        }

        this._reportsById.get(trackID)?.push(report);
        this.filterKind(report);

        return;
      }

      if (this._reportsById.has(report.trackIdentifier)) {
        console.debug(
          'AculabCloudCallStatistics: Track ID already exists skipping',
        );
        return;
      }

      console.debug(
        `AculabCloudCallStatistics: Found report with trackIdentifier ${report.trackIdentifier}`,
      );

      this._reportsById.set(report.trackIdentifier, [report]);
      this.filterKind(report);

      // Set Local ID
      if (report.type !== 'media-source') {
        console.debug("Report isn't of type media-source skipping report");
        return;
      }

      if (typeof report.id !== 'string') {
        console.debug('Invalid report ID skipping report');
        return;
      }

      this._localTrackIdentifiers.set(report.id, report.trackIdentifier);
      const reportsToAdd = unsortedReports.filter(
        unsortedReport => unsortedReport.mediaSourceId === report.id,
      );

      if (reportsToAdd.length === 0) return;
      const reportsFromID = this._reportsById.get(report.trackIdentifier)!;

      reportsToAdd.forEach(reportToAdd => {
        reportsFromID.push(reportToAdd);
        this.filterKind(reportToAdd);

        unsortedReports = unsortedReports.filter(
          unsortedReport => unsortedReport !== reportToAdd,
        );
      });
    });
  }

  /**
   * Add a given report to _outboundReportsByKind or _inboundReportsByKind
   * depending on the report type
   * @param report
   */
  private filterKind(report: Report) {
    if (
      typeof report.kind !== 'string' ||
      !this._possibleKinds.includes(report.kind as RTCReportKind)
    )
      return;

    switch (report.type) {
      case 'outbound-rtp':
        this._outboundReportsByKind.set(report.kind as RTCReportKind, report);
        break;

      case 'inbound-rtp':
        this._inboundReportsByKind.set(report.kind as RTCReportKind, report);
        break;
    }
  }

  getReportFromTrackId(trackId: string) {
    return this._reportsById.get(trackId);
  }

  getOutboundReportsFromKind(kind: RTCReportKind) {
    return this._outboundReportsByKind.get(kind);
  }

  getInboundReportsFromKind(kind: RTCReportKind) {
    return this._inboundReportsByKind.get(kind);
  }
}
