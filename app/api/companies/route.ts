import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const companies = await prisma.company.findMany({
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(companies)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, website, linkedin, notes } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const existing = await prisma.company.findFirst({
    where: { name: { equals: name.trim() } },
  })
  if (existing) return NextResponse.json(existing)

  const company = await prisma.company.create({
    data: { name: name.trim(), website, linkedin, notes },
  })
  return NextResponse.json(company, { status: 201 })
}
