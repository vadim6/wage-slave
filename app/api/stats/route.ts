import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { StatsResponse } from '@/lib/types'

export async function GET() {
  const [stageCounts, sourceGroups, totalApplied, totalPastApplied, recentEvents] =
    await Promise.all([
      prisma.application.groupBy({ by: ['stage'], _count: { id: true } }),
      prisma.application.groupBy({ by: ['source'], _count: { id: true } }),
      prisma.application.count({ where: { stage: { not: 'WISHLIST' } } }),
      prisma.application.count({
        where: { stage: { in: ['SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'GHOSTED'] } },
      }),
      prisma.$queryRaw<{ week: string; count: number }[]>`
        SELECT strftime('%Y-%W', appliedAt / 1000, 'unixepoch') as week, COUNT(*) as count
        FROM Application
        WHERE appliedAt IS NOT NULL
        GROUP BY week
        ORDER BY week ASC
        LIMIT 52
      `,
    ])

  const stageCountsFormatted = stageCounts.map((s) => ({
    stage: s.stage as import('@/lib/types').Stage,
    count: s._count.id,
  }))

  const sourceCounts = sourceGroups
    .filter((s) => s.source)
    .map((s) => ({ source: s.source ?? 'Unknown', count: s._count.id }))

  const responseRate = totalApplied > 0 ? Math.round((totalPastApplied / totalApplied) * 100) : 0

  const offerCount = stageCounts.find((s) => s.stage === 'OFFER')?._count.id ?? 0
  const terminalCount =
    (stageCounts.find((s) => s.stage === 'REJECTED')?._count.id ?? 0) +
    (stageCounts.find((s) => s.stage === 'WITHDRAWN')?._count.id ?? 0) +
    (stageCounts.find((s) => s.stage === 'GHOSTED')?._count.id ?? 0)
  const activeCount = stageCountsFormatted.reduce((sum, s) => sum + s.count, 0) - terminalCount

  const weeklyApplications = recentEvents.map((r) => ({
    week: r.week,
    count: Number(r.count),
  }))

  const stats: StatsResponse = {
    stageCounts: stageCountsFormatted,
    weeklyApplications,
    responseRate,
    sourceCounts,
    totalActive: activeCount,
    totalOffers: offerCount,
  }

  return NextResponse.json(stats)
}
