import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const [users, farms, animals] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.farm.count(),
      prisma.animal.count(),
    ])

    return NextResponse.json({ data: { users, farms, animals } })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
