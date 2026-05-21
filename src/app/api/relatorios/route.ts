import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { getUserPlan, canAccessModule, checkTrialAccess, incrementTrialUsage } from '@/lib/plans'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const plan = await getUserPlan(session.userId)
    if (!canAccessModule(plan, 'relatorios')) {
      const trial = await checkTrialAccess(session.userId, 'relatorios')
      if (!trial.allowed) {
        return NextResponse.json({ error: `Você usou suas ${trial.limit} visualizações gratuitas de teste. Assine para continuar.`, upgrade: true, trialExhausted: true, module: 'relatorios', limit: trial.limit }, { status: 403 })
      }
      await incrementTrialUsage(session.userId, 'relatorios')
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') ?? 'milk'
    const months = Math.min(parseInt(searchParams.get('months') ?? '6'), 12)

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ data: [] })

    if (type === 'milk') {
      const data = await Promise.all(
        Array.from({ length: months }, (_, i) => {
          const date = subMonths(new Date(), months - 1 - i)
          return prisma.dailyMilkTotal.aggregate({
            where: {
              farmId,
              date: { gte: startOfMonth(date), lte: endOfMonth(date) },
            },
            _sum: { totalLiters: true },
            _count: true,
          }).then((agg) => ({
            month: format(date, 'MMM/yy', { locale: ptBR }),
            total: agg._sum.totalLiters ?? 0,
            dias: agg._count,
          }))
        })
      )
      return NextResponse.json({ data })
    }

    if (type === 'financial') {
      const data = await Promise.all(
        Array.from({ length: months }, (_, i) => {
          const date = subMonths(new Date(), months - 1 - i)
          return Promise.all([
            prisma.financialRecord.aggregate({
              where: { farmId, type: 'INCOME', date: { gte: startOfMonth(date), lte: endOfMonth(date) } },
              _sum: { amount: true },
            }),
            prisma.financialRecord.aggregate({
              where: { farmId, type: 'EXPENSE', date: { gte: startOfMonth(date), lte: endOfMonth(date) } },
              _sum: { amount: true },
            }),
          ]).then(([income, expense]) => ({
            month: format(date, 'MMM/yy', { locale: ptBR }),
            receita: income._sum.amount ?? 0,
            despesa: expense._sum.amount ?? 0,
            lucro: (income._sum.amount ?? 0) - (expense._sum.amount ?? 0),
          }))
        })
      )
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Tipo de relatório inválido' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
