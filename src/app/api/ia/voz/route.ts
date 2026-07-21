import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'
import { addDays } from 'date-fns'

const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

const TIPO_LABELS: Record<string, string> = {
  leite: 'Produção de leite',
  pesagem: 'Pesagem',
  reproducao: 'Evento reprodutivo',
  sanitario: 'Evento sanitário',
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { tipo, animalId, dados } = await request.json()

    const SEM_ANIMAL = ['leite_total']
    if (!tipo || !dados) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }
    if (!SEM_ANIMAL.includes(tipo) && !animalId) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })

    const dataRegistro = (dados.data as string) ?? hoje()

    // Produção total do rebanho — não precisa de animal
    if (tipo === 'leite_total') {
      const litros = Number(dados.litros ?? 0)
      if (litros <= 0) return NextResponse.json({ error: 'Quantidade de litros inválida.' }, { status: 422 })
      const dateObj = new Date(dataRegistro)
      // Soma ao que já existe no dia em vez de substituir — um segundo
      // comando de voz no mesmo dia (ex: "mais 50 litros à tarde") não pode
      // apagar o que já tinha sido registrado antes, seja por voz ou manual.
      const existing = await prisma.dailyMilkTotal.findUnique({ where: { farmId_date: { farmId, date: dateObj } } })
      const morningLiters = (existing?.morningLiters ?? 0) + litros
      const afternoonLiters = existing?.afternoonLiters ?? 0
      const eveningLiters = existing?.eveningLiters ?? 0
      const totalLiters = morningLiters + afternoonLiters + eveningLiters
      await prisma.dailyMilkTotal.upsert({
        where: { farmId_date: { farmId, date: dateObj } },
        update: { morningLiters, afternoonLiters, eveningLiters, totalLiters },
        create: { farmId, date: dateObj, morningLiters, afternoonLiters, eveningLiters, totalLiters },
      })
      return NextResponse.json({
        sucesso: true,
        confirmacao: `${litros}L somados à produção de ${new Date(dataRegistro).toLocaleDateString('pt-BR')} — total do dia agora é ${totalLiters}L.`,
        animal: { nome: null, tag: '' },
        tipo,
      })
    }

    const animal = await prisma.animal.findFirst({ where: { id: animalId, farmId } })
    if (!animal) return NextResponse.json({ error: 'Animal não encontrado.' }, { status: 404 })

    const animalLabel = animal.name ?? `brinco #${animal.tag}`

    if (tipo === 'leite') {
      const litros = Number(dados.litros ?? 0)
      if (litros <= 0) return NextResponse.json({ error: 'Quantidade de litros inválida.' }, { status: 422 })
      await prisma.milkProduction.create({
        data: {
          animalId: animal.id,
          date: new Date(dataRegistro),
          morningLiters: litros,
          afternoonLiters: 0,
          eveningLiters: 0,
          totalLiters: litros,
        },
      })
      return NextResponse.json({
        sucesso: true,
        confirmacao: `${litros}L registrados para ${animalLabel} em ${new Date(dataRegistro).toLocaleDateString('pt-BR')}.`,
        animal: { nome: animal.name, tag: animal.tag },
        tipo,
      })
    }

    if (tipo === 'pesagem') {
      const peso = Number(dados.peso ?? 0)
      if (peso <= 0) return NextResponse.json({ error: 'Peso inválido.' }, { status: 422 })
      await prisma.weightRecord.create({
        data: { animalId: animal.id, weight: peso, date: new Date(dataRegistro) },
      })
      return NextResponse.json({
        sucesso: true,
        confirmacao: `${peso}kg registrados para ${animalLabel} em ${new Date(dataRegistro).toLocaleDateString('pt-BR')}.`,
        animal: { nome: animal.name, tag: animal.tag },
        tipo,
      })
    }

    if (tipo === 'reproducao') {
      const tipoEvento = dados.tipo as string
      if (!tipoEvento) return NextResponse.json({ error: 'Tipo de evento reprodutivo não identificado.' }, { status: 422 })
      const eventDate = new Date(dataRegistro)
      let expectedCalving: Date | undefined
      if (tipoEvento === 'INSEMINATION' || tipoEvento === 'NATURAL_MATING') {
        expectedCalving = addDays(eventDate, 283)
      }

      await prisma.reproductiveEvent.create({
        data: {
          animalId: animal.id,
          type: tipoEvento,
          date: eventDate,
          bullName: dados.touro as string | undefined,
          expectedCalving,
        },
      })

      // Mesma lógica de alertas da rota /api/reproducao
      if (['INSEMINATION', 'NATURAL_MATING', 'PREGNANCY_CHECK_POSITIVE', 'ESTRUS'].includes(tipoEvento)) {
        await prisma.alert.deleteMany({
          where: { farmId, animalId: animal.id, title: { startsWith: 'Previsão de Cio' } },
        })
      }

      if ((tipoEvento === 'INSEMINATION' || tipoEvento === 'NATURAL_MATING') && expectedCalving) {
        await prisma.alert.create({
          data: {
            farmId, animalId: animal.id, type: 'REPRODUCTIVE',
            title: `Parto Previsto — ${animalLabel}`,
            description: `Parto previsto para ${expectedCalving.toLocaleDateString('pt-BR')}`,
            dueDate: expectedCalving, priority: 'HIGH',
          },
        })
      }

      let cioDueDate: Date | null = null
      let cioDescription = ''
      if (tipoEvento === 'ESTRUS') {
        cioDueDate = addDays(eventDate, 21)
        cioDescription = `Próximo cio previsto — ciclo de 21 dias a partir de ${eventDate.toLocaleDateString('pt-BR')}`
      } else if (tipoEvento === 'CALVING') {
        cioDueDate = addDays(eventDate, 45)
        cioDescription = `Retorno ao cio pós-parto previsto — 45 dias após o parto`
      } else if (tipoEvento === 'PREGNANCY_CHECK_NEGATIVE') {
        cioDueDate = addDays(eventDate, 21)
        cioDescription = `Retorno ao cio previsto após diagnóstico negativo`
      }
      if (cioDueDate) {
        await prisma.alert.create({
          data: {
            farmId, animalId: animal.id, type: 'REPRODUCTIVE',
            title: `Previsão de Cio — ${animalLabel}`,
            description: cioDescription,
            dueDate: cioDueDate, priority: 'MEDIUM',
          },
        })
      }

      return NextResponse.json({
        sucesso: true,
        confirmacao: `Evento registrado para ${animalLabel} em ${eventDate.toLocaleDateString('pt-BR')}.`,
        animal: { nome: animal.name, tag: animal.tag },
        tipo,
      })
    }

    if (tipo === 'sanitario') {
      const tipoSanitario = (dados.tipo as string) ?? 'OTHER'
      const descricao = (dados.descricao as string) || TIPO_LABELS[tipo]
      await prisma.healthRecord.create({
        data: {
          animalId: animal.id,
          type: tipoSanitario,
          date: new Date(dataRegistro),
          description: descricao,
        },
      })
      return NextResponse.json({
        sucesso: true,
        confirmacao: `${descricao} registrado para ${animalLabel} em ${new Date(dataRegistro).toLocaleDateString('pt-BR')}.`,
        animal: { nome: animal.name, tag: animal.tag },
        tipo,
      })
    }

    return NextResponse.json({ error: 'Tipo de registro não suportado.' }, { status: 422 })
  } catch (error) {
    console.error('[IA VOZ]', error)
    return NextResponse.json({ error: 'Erro ao salvar registro.' }, { status: 500 })
  }
}
