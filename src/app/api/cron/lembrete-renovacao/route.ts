import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendRenewalReminderEmail } from '@/lib/email'
import { PLANS } from '@/lib/plans'
import type { PlanKey } from '@/lib/plans'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const in6days = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Assinaturas que vencem entre 6 e 7 dias a partir de agora
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        plan: { in: ['PRO', 'PREMIUM'] },
        endDate: { gte: in6days, lt: in7days },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    })

    let enviados = 0
    for (const sub of subscriptions) {
      try {
        const planName = PLANS[sub.plan as PlanKey]?.name ?? sub.plan
        await sendRenewalReminderEmail(sub.user.email, sub.user.name, sub.endDate!, planName)
        enviados++
      } catch (e) {
        console.error(`[CRON] Erro ao enviar lembrete para ${sub.user.email}:`, e)
      }
    }

    return NextResponse.json({ ok: true, enviados, total: subscriptions.length })
  } catch (error) {
    console.error('[CRON LEMBRETE]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
