import type { CrowdLevel, CrowdReport, MinuteRange, Pandal } from '../types'

export const REPORT_TTL_MS = 2 * 60 * 60 * 1_000

export interface CrowdEstimate {
  level: CrowdLevel
  queueMinutes: MinuteRange
  basis: 'typical-model' | 'local-report'
  label: string
  istHour: number
  reportedAt?: number
  expiresAt?: number
  uncertainty: string
}

const istHourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  hourCycle: 'h23',
})

export function getIstHour(timestamp: number): number {
  if (!Number.isFinite(timestamp) || !Number.isFinite(new Date(timestamp).getTime())) {
    throw new RangeError('Invalid timestamp')
  }
  return Number(istHourFormatter.format(timestamp))
}

export function isFreshCrowdReport(
  report: CrowdReport | undefined,
  pandalId: string,
  now: number,
): report is CrowdReport {
  return report !== undefined && report !== null
    && report.pandalId === pandalId
    && ['light', 'moderate', 'heavy'].includes(report.level)
    && Number.isFinite(now) && Number.isFinite(report.reportedAt)
    && report.reportedAt >= 0 && report.reportedAt <= now
    && now - report.reportedAt < REPORT_TTL_MS
}

export function estimateCrowd(
  pandal: Pick<Pandal, 'id' | 'popularity'>,
  departureTimestamp: number,
  report?: CrowdReport,
): CrowdEstimate {
  if (![1, 2, 3].includes(pandal.popularity)) throw new RangeError('Invalid popularity')
  const istHour = getIstHour(departureTimestamp)
  const timePressure = istHour >= 17 || istHour < 1 ? 2 : istHour >= 12 || istHour < 3 ? 1 : 0
  const score = pandal.popularity - 1 + timePressure
  const typicalLevel: CrowdLevel = score >= 3 ? 'heavy' : score >= 1 ? 'moderate' : 'light'
  const localReport = isFreshCrowdReport(report, pandal.id, departureTimestamp) ? report : undefined
  const level = localReport?.level ?? typicalLevel
  const ranges: Record<CrowdLevel, MinuteRange> = {
    light: { min: 3, max: 12 },
    moderate: { min: 12, max: 30 },
    heavy: { min: 30, max: 65 },
  }
  const popularityOffset = pandal.popularity - 1
  return {
    level,
    queueMinutes: {
      min: ranges[level].min + popularityOffset * 3,
      max: ranges[level].max + popularityOffset * 6,
    },
    basis: localReport ? 'local-report' : 'typical-model',
    label: localReport
      ? 'Your local report (expires after 2 hours); estimated queue'
      : 'Typical crowd estimate (IST), not a live observation',
    istHour,
    ...(localReport ? {
      reportedAt: localReport.reportedAt,
      expiresAt: localReport.reportedAt + REPORT_TTL_MS,
    } : {}),
    uncertainty: 'Queue ranges are model estimates, not measured waits. Typical patterns are not guaranteed for any date or festival schedule.',
  }
}