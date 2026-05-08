import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { FunnelChart } from '@/components/dashboard/funnel-chart'
import { TimelineChart } from '@/components/dashboard/timeline-chart'
import { SourceChart } from '@/components/dashboard/source-chart'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { SankeyChart } from '@/components/dashboard/sankey-chart'

// Maps event types to the stage they represent
const EVENT_TO_STAGE: Record<string, string> = {
  APPLICATION_SENT: 'APPLIED',
  RECRUITER_CALL: 'SCREENING',
  TECHNICAL_SCREEN: 'SCREENING',
  INTERVIEW_ROUND: 'INTERVIEW',
  TAKE_HOME_TASK: 'INTERVIEW',
  OFFER_RECEIVED: 'OFFER',
  REJECTION_RECEIVED: 'REJECTED',
}

const STAGE_ORDER = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'GHOSTED', 'WITHDRAWN']

function buildSankeyData(
  applications: { id: number; stage: string; source: string | null }[],
  events: { applicationId: number; eventType: string }[],
) {
  const eventsByApp = new Map<number, string[]>()
  for (const e of events) {
    const stage = EVENT_TO_STAGE[e.eventType]
    if (!stage) continue
    if (!eventsByApp.has(e.applicationId)) eventsByApp.set(e.applicationId, [])
    eventsByApp.get(e.applicationId)!.push(stage)
  }

  const transitionCounts = new Map<string, number>()
  const inc = (from: string, to: string) => {
    const key = `${from}→${to}`
    transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + 1)
  }

  for (const app of applications) {
    const source = app.source ?? 'Unknown'
    const stages = eventsByApp.get(app.id) ?? []

    const path: string[] = []
    for (const s of stages) {
      if (path[path.length - 1] !== s) path.push(s)
    }
    if (path[path.length - 1] !== app.stage) path.push(app.stage)
    if (path.length === 0) path.push('APPLIED', app.stage)

    // source → first stage
    if (path.length >= 1) inc(source, path[0])

    // stage → stage transitions
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i] !== path[i + 1]) inc(path[i], path[i + 1])
    }
  }

  if (transitionCounts.size === 0) return { nodes: [], links: [] }

  const usedSources = new Set<string>()
  const usedStages = new Set<string>()
  for (const key of transitionCounts.keys()) {
    const [from, to] = key.split('→')
    if (STAGE_ORDER.includes(from)) usedStages.add(from); else usedSources.add(from)
    if (STAGE_ORDER.includes(to)) usedStages.add(to); else usedSources.add(to)
  }

  // Sources first, then stages in pipeline order
  const nodes = [
    ...[...usedSources].sort().map(name => ({ name })),
    ...STAGE_ORDER.filter(s => usedStages.has(s)).map(name => ({ name })),
  ]
  const idx = (name: string) => nodes.findIndex(n => n.name === name)

  const links = [...transitionCounts.entries()]
    .map(([key, value]) => {
      const [from, to] = key.split('→')
      return { source: idx(from), target: idx(to), value }
    })
    .filter(l => l.source !== -1 && l.target !== -1)

  return { nodes, links }
}

async function getStats() {
  const [stageCounts, sourceGroups, totalApplied, totalPastApplied, weeklyRaw, applications, events] = await Promise.all([
    prisma.application.groupBy({ by: ['stage'], _count: { id: true } }),
    prisma.application.groupBy({ by: ['source'], _count: { id: true } }),
    prisma.application.count({ where: { stage: { not: 'WISHLIST' } } }),
    prisma.application.count({
      where: { stage: { in: ['SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'GHOSTED'] } },
    }),
    prisma.$queryRaw<{ week: string; count: number }[]>`
      SELECT strftime('%Y-%W', appliedAt / 1000, 'unixepoch') as week, COUNT(*) as count
      FROM Application WHERE appliedAt IS NOT NULL
      GROUP BY week ORDER BY week ASC LIMIT 52
    `,
    prisma.application.findMany({
      where: { stage: { not: 'WISHLIST' } },
      select: { id: true, stage: true, source: true },
    }),
    prisma.applicationEvent.findMany({
      orderBy: { occurredAt: 'asc' },
      select: { applicationId: true, eventType: true },
    }),
  ])

  const stageCountsFormatted = stageCounts.map((s) => ({ stage: s.stage as import('@/lib/types').Stage, count: s._count.id }))
  const sourceCounts = sourceGroups
    .filter((s) => s.source)
    .map((s) => ({ source: s.source!, count: s._count.id }))
  const responseRate = totalApplied > 0 ? Math.round((totalPastApplied / totalApplied) * 100) : 0
  const offerCount = stageCounts.find((s) => s.stage === 'OFFER')?._count.id ?? 0
  const terminalCount = ['REJECTED', 'WITHDRAWN', 'GHOSTED'].reduce(
    (sum, s) => sum + (stageCounts.find((x) => x.stage === s)?._count.id ?? 0),
    0
  )
  const totalAll = stageCountsFormatted.reduce((sum, s) => sum + s.count, 0)
  const totalActive = totalAll - terminalCount
  const weeklyApplications = weeklyRaw.map((r) => ({ week: r.week, count: Number(r.count) }))
  const sankeyData = buildSankeyData(applications, events)

  return { stageCountsFormatted, sourceCounts, responseRate, totalActive, totalOffers: offerCount, weeklyApplications, totalAll, sankeyData }
}

export default async function DashboardPage() {
  const { stageCountsFormatted, sourceCounts, responseRate, totalActive, totalOffers, weeklyApplications, totalAll, sankeyData } =
    await getStats()

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Dashboard</h1>

      <StatsCards
        totalApplications={totalAll}
        totalActive={totalActive}
        totalOffers={totalOffers}
        responseRate={responseRate}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <FunnelChart stageCounts={stageCountsFormatted} />
        <TimelineChart weeklyApplications={weeklyApplications} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <SourceChart sourceCounts={sourceCounts} />
        <Suspense fallback={
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '20px', color: 'var(--color-muted)', fontSize: '14px' }}>
            Loading activity...
          </div>
        }>
          <RecentActivity />
        </Suspense>
      </div>

      <SankeyChart data={sankeyData} />
    </div>
  )
}
