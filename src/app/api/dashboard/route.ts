import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { startOfMonth, endOfMonth, startOfDay, endOfDay, addDays } from 'date-fns'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ data: { totalAnimals: 0, activeAnimals: 0, dairyAnimals: 0, todayMilkTotal: 0, monthMilkTotal: 0, pendingAlerts: 0, criticalAlerts: 0, monthIncome: 0, monthExpense: 0, pregnantAnimals: 0 } })

    const now = new Date()

    const [
      totalAnimals, activeAnimals, dairyAnimals,
      todayMilk, monthMilk,
      pendingAlerts, criticalAlerts,
      monthIncome, monthExpense,
      pregnantAnimals,
      upcomingEstrus,
    ] = await Promise.all([
      prisma.animal.count({ where: { farmId } }),
      prisma.animal.count({ where: { farmId, status: 'ACTIVE' } }),
      prisma.animal.count({ where: { farmId, type: 'DAIRY', status: 'ACTIVE' } }),
      prisma.dailyMilkTotal.aggregate({
        where: { farmId, date: { gte: startOfDay(now), lte: endOfDay(now) } },
        _sum: { totalLiters: true },
      }),
      prisma.dailyMilkTotal.aggregate({
        where: { farmId, date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
        _sum: { totalLiters: true },
      }),
      prisma.alert.count({ where: { farmId, isRead: false } }),
      prisma.alert.count({ where: { farmId, isRead: false, priority: 'CRITICAL' } }),
      prisma.financialRecord.aggregate({
        where: { farmId, type: 'INCOME', date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
        _sum: { amount: true },
      }),
      prisma.financialRecord.aggregate({
        where: { farmId, type: 'EXPENSE', date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
        _sum: { amount: true },
      }),
      prisma.reproductiveEvent.count({
        where: { animal: { farmId }, type: 'PREGNANCY_CHECK_POSITIVE' },
      }),
      prisma.alert.findMany({
        where: {
          farmId,
          isRead: false,
          title: { startsWith: 'Previsão de Cio' },
          dueDate: { gte: startOfDay(now), lte: endOfDay(addDays(now, 14)) },
        },
        orderBy: { dueDate: 'asc' },
        select: { id: true, title: true, dueDate: true, description: true },
      }),
    ])

    return NextResponse.json({
      data: {
        totalAnimals, activeAnimals, dairyAnimals,
        todayMilkTotal: todayMilk._sum.totalLiters ?? 0,
        monthMilkTotal: monthMilk._sum.totalLiters ?? 0,
        pendingAlerts, criticalAlerts,
        monthIncome: monthIncome._sum.amount ?? 0,
        monthExpense: monthExpense._sum.amount ?? 0,
        pregnantAnimals,
        upcomingEstrus,
      },
    })
  } catch (error) {
    console.error('[DASHBOARD]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
