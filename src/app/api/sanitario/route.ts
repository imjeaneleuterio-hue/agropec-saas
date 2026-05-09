import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { healthRecordSchema } from '@/lib/validations'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const animalId = searchParams.get('animalId')
    const type = searchParams.get('type')

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ data: [] })

    const records = await prisma.healthRecord.findMany({
      where: {
        animal: { farmId },
        ...(animalId && { animalId }),
        ...(type && { type: type as 'VACCINATION' }),
      },
      orderBy: { date: 'desc' },
      include: {
        animal: { select: { id: true, name: true, tag: true } },
      },
    })

    return NextResponse.json({ data: records })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

const HEALTH_CATEGORY: Record<string, string> = {
  VACCINATION: 'Medicamentos e Vacinas',
  TREATMENT: 'Medicamentos e Vacinas',
  PARASITE_CONTROL: 'Medicamentos e Vacinas',
  EXAM: 'Veterinário',
  SURGERY: 'Veterinário',
  HOOF_TRIM: 'Veterinário',
  OTHER: 'Veterinário',
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = healthRecordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const farmId = await getActiveFarmId(session.userId)

    const record = await prisma.healthRecord.create({
      data: {
        ...parsed.data,
        date: new Date(parsed.data.date),
        nextDueDate: parsed.data.nextDueDate ? new Date(parsed.data.nextDueDate) : undefined,
      },
    })

    if (farmId) {
      const animal = await prisma.animal.findUnique({ where: { id: parsed.data.animalId } })
      const animalLabel = animal?.name ?? `#${animal?.tag}`

      if (parsed.data.cost && parsed.data.cost > 0) {
        await prisma.financialRecord.create({
          data: {
            farmId,
            type: 'EXPENSE',
            category: HEALTH_CATEGORY[parsed.data.type] ?? 'Veterinário',
            description: parsed.data.description,
            amount: parsed.data.cost,
            date: new Date(parsed.data.date),
            paymentStatus: 'PAID',
            notes: parsed.data.veterinarian ? `Responsável: ${parsed.data.veterinarian}` : undefined,
          },
        })
      }

      if (parsed.data.nextDueDate) {
        const TYPE_LABELS: Record<string, string> = {
          VACCINATION: 'Vacinação',
          TREATMENT: 'Retorno/Tratamento',
          PARASITE_CONTROL: 'Controle Parasitário',
          EXAM: 'Exame',
          SURGERY: 'Pós-cirúrgico',
          HOOF_TRIM: 'Casqueamento',
          OTHER: 'Sanitário',
        }
        const alertType = parsed.data.type === 'VACCINATION' ? 'VACCINATION' : 'HEALTH'
        const priority = parsed.data.type === 'VACCINATION' ? 'HIGH' : 'MEDIUM'
        const label = TYPE_LABELS[parsed.data.type] ?? 'Sanitário'

        await prisma.alert.create({
          data: {
            farmId,
            type: alertType,
            title: `${label} — ${animalLabel}`,
            description: parsed.data.description,
            dueDate: new Date(parsed.data.nextDueDate),
            priority,
            animalId: parsed.data.animalId,
          },
        })
      }
    }

    return NextResponse.json({ data: record, message: 'Registro sanitário criado' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
