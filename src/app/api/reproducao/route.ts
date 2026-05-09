import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { reproductiveEventSchema } from '@/lib/validations'
import { addDays } from 'date-fns'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const animalId = searchParams.get('animalId')
    const type = searchParams.get('type')

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ data: [] })

    const events = await prisma.reproductiveEvent.findMany({
      where: {
        animal: { farmId },
        ...(animalId && { animalId }),
        ...(type && { type: type as 'INSEMINATION' }),
      },
      orderBy: { date: 'desc' },
      include: {
        animal: { select: { id: true, name: true, tag: true, breed: true } },
      },
    })

    return NextResponse.json({ data: events })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = reproductiveEventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const data = parsed.data
    const eventDate = new Date(data.date)

    let expectedCalving: Date | undefined
    if ((data.type === 'INSEMINATION' || data.type === 'NATURAL_MATING') && !data.expectedCalving) {
      expectedCalving = addDays(eventDate, 283)
    } else if (data.expectedCalving) {
      expectedCalving = new Date(data.expectedCalving)
    }

    const event = await prisma.reproductiveEvent.create({
      data: { ...data, date: eventDate, expectedCalving },
    })

    const farmId = await getActiveFarmId(session.userId)
    if (farmId) {
      const animal = await prisma.animal.findUnique({ where: { id: data.animalId } })
      const animalLabel = animal?.name ?? `#${animal?.tag}`

      // Cancela previsão de cio pendente quando a vaca foi coberta ou confirmou prenhez
      if (data.type === 'INSEMINATION' || data.type === 'NATURAL_MATING' || data.type === 'PREGNANCY_CHECK_POSITIVE') {
        await prisma.alert.deleteMany({
          where: {
            farmId,
            animalId: data.animalId,
            isRead: false,
            title: { startsWith: 'Previsão de Cio' },
          },
        })
      }

      // Alerta de parto previsto
      if ((data.type === 'INSEMINATION' || data.type === 'NATURAL_MATING' || data.type === 'PREGNANCY_CHECK_POSITIVE') && expectedCalving) {
        await prisma.alert.create({
          data: {
            farmId,
            type: 'REPRODUCTIVE',
            title: `Parto Previsto — ${animalLabel}`,
            description: `Parto previsto para ${expectedCalving.toLocaleDateString('pt-BR')}`,
            dueDate: expectedCalving,
            priority: 'HIGH',
            animalId: data.animalId,
          },
        })
      }

      // Alerta de previsão de cio
      let cioDueDate: Date | null = null
      let cioDescription = ''

      if (data.type === 'ESTRUS') {
        cioDueDate = addDays(eventDate, 21)
        cioDescription = `Próximo cio previsto — ciclo de 21 dias a partir de ${eventDate.toLocaleDateString('pt-BR')}`
      } else if (data.type === 'CALVING') {
        cioDueDate = addDays(eventDate, 45)
        cioDescription = `Retorno ao cio pós-parto previsto — 45 dias após o parto de ${eventDate.toLocaleDateString('pt-BR')}`
      } else if (data.type === 'PREGNANCY_CHECK_NEGATIVE') {
        cioDueDate = addDays(eventDate, 21)
        cioDescription = `Retorno ao cio previsto após diagnóstico negativo em ${eventDate.toLocaleDateString('pt-BR')}`
      }

      if (cioDueDate) {
        await prisma.alert.create({
          data: {
            farmId,
            type: 'REPRODUCTIVE',
            title: `Previsão de Cio — ${animalLabel}`,
            description: cioDescription,
            dueDate: cioDueDate,
            priority: 'MEDIUM',
            animalId: data.animalId,
          },
        })
      }
    }

    return NextResponse.json({ data: event, message: 'Evento registrado com sucesso' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
