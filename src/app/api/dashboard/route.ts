import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ data: { totalAnimals: 0, activeAnimals: 0, dairyAnimals: 0, todayMilkTotal: 0, monthMilkTotal: 0, pendingAlerts: 0, criticalAlerts: 0, monthIncome: 0, monthExpense: 0, pregnantAnimals: 0 } })

    // "Hoje" tem que ser o dia calendário do Brasil, não o do servidor (UTC
    // na Vercel) — depois de ~21h no horário de Brasília o servidor já está
    // no dia seguinte, e usar `new Date()` direto fazia "Produção Hoje"
    // sumir à noite. As datas no banco são gravadas como meia-noite UTC do
    // dia "YYYY-MM-DD" (a partir de um <input type="date">), então os
    // limites do intervalo são calculados em UTC puro (Date.UTC, sem
    // depender do fuso de onde o servidor está rodando).
    const hojeBR = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const [anoBR, mesBR, diaBR] = hojeBR.split('-').map(Number)
    const dayStart = new Date(Date.UTC(anoBR, mesBR - 1, diaBR, 0, 0, 0, 0))
    const dayEnd = new Date(Date.UTC(anoBR, mesBR - 1, diaBR, 23, 59, 59, 999))
    const monthStart = new Date(Date.UTC(anoBR, mesBR - 1, 1, 0, 0, 0, 0))
    const monthEnd = new Date(Date.UTC(anoBR, mesBR, 0, 23, 59, 59, 999))
    const estrusWindowEnd = new Date(dayEnd.getTime() + 14 * 86400000)

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
        where: { farmId, date: { gte: dayStart, lte: dayEnd } },
        _sum: { totalLiters: true },
      }),
      prisma.dailyMilkTotal.aggregate({
        where: { farmId, date: { gte: monthStart, lte: monthEnd } },
        _sum: { totalLiters: true },
      }),
      prisma.alert.count({ where: { farmId, isRead: false } }),
      prisma.alert.count({ where: { farmId, isRead: false, priority: 'CRITICAL' } }),
      prisma.financialRecord.aggregate({
        where: { farmId, type: 'INCOME', date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.financialRecord.aggregate({
        where: { farmId, type: 'EXPENSE', date: { gte: monthStart, lte: monthEnd } },
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
          dueDate: { gte: dayStart, lte: estrusWindowEnd },
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
