import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const apps = await prisma.application.findMany({
    select: { source: true },
    where: { source: { not: null } },
    distinct: ['source'],
    orderBy: { source: 'asc' },
  })
  const sources = apps.map(a => a.source).filter(Boolean) as string[]
  return NextResponse.json(sources)
}
