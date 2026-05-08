import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find all non-WISHLIST applications missing an APPLICATION_SENT event
  const apps = await prisma.application.findMany({
    where: { stage: { not: 'WISHLIST' } },
    select: { id: true, appliedAt: true, updatedAt: true },
  })

  const existing = await prisma.applicationEvent.findMany({
    where: { eventType: 'APPLICATION_SENT' },
    select: { applicationId: true },
  })
  const alreadyHas = new Set(existing.map(e => e.applicationId))

  const toCreate = apps.filter(a => !alreadyHas.has(a.id))

  if (toCreate.length === 0) {
    console.log('Nothing to backfill — all applications already have APPLICATION_SENT events.')
    return
  }

  console.log(`Backfilling ${toCreate.length} applications...`)

  await prisma.applicationEvent.createMany({
    data: toCreate.map(a => ({
      applicationId: a.id,
      eventType: 'APPLICATION_SENT',
      title: 'Application submitted',
      occurredAt: a.appliedAt ?? a.updatedAt,
    })),
  })

  console.log(`Done. Created ${toCreate.length} APPLICATION_SENT events.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
