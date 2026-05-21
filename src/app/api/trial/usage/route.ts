import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserPlan, canAccessModule, TRIAL_LIMITS } from '@/lib/plans'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const module = searchParams.get('module')
    if (!module) return NextResponse.json({ error: 'Módulo obrigatório' }, { status: 400 })

    const plan = await getUserPlan(session.userId)
    if (canAccessModule(plan, module)) {
      return NextResponse.json({ plan, unlocked: true })
    }

    const limit = TRIAL_LIMITS[module] ?? 0
    const usage = await prisma.trialUsage.findUnique({
      where: { userId_module: { userId: session.userId, module } },
    })
    const used = usage?.count ?? 0

    return NextResponse.json({ plan, unlocked: false, used, limit, remaining: limit - used })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
