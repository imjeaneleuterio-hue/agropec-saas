import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PLANS } from '@/lib/plans'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const [users, farms, animals, subscriptions] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.farm.count(),
      prisma.animal.count(),
      prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        select: { plan: true },
      }),
    ])

    const pro = subscriptions.filter((s) => s.plan === 'PRO').length
    const premium = subscriptions.filter((s) => s.plan === 'PREMIUM').length
    const revenue = pro * PLANS.PRO.price + premium * PLANS.PREMIUM.price

    return NextResponse.json({ data: { users, farms, animals, revenue, pro, premium } })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
