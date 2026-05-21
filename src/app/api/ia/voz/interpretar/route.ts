import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })

const hoje = () => new Date().toISOString().split('T')[0]

const SYSTEM_PROMPT = `Você é um assistente que interpreta comandos de voz de produtores rurais brasileiros.

Data de hoje: ${hoje()}

Retorne SOMENTE JSON válido:
{
  "tipo": "leite_total" | "leite" | "pesagem" | "reproducao" | "sanitario" | "nao_reconhecido",
  "animalTag": "número do brinco como string, ou null",
  "animalNome": "nome do animal se mencionado, ou null",
  "dados": {
    para leite_total (produção total do rebanho/fazenda, sem animal específico): { "litros": número, "data": "YYYY-MM-DD" }
    para leite (produção de um animal específico): { "litros": número, "data": "YYYY-MM-DD" }
    para pesagem: { "peso": número em kg, "data": "YYYY-MM-DD" }
    para reproducao: { "tipo": "ESTRUS"|"NATURAL_MATING"|"INSEMINATION"|"PREGNANCY_CHECK_POSITIVE"|"PREGNANCY_CHECK_NEGATIVE"|"CALVING"|"WEANING"|"DRY_OFF"|"ABORTION", "data": "YYYY-MM-DD", "touro": string|null }
    para sanitario: { "tipo": "VACCINATION"|"TREATMENT"|"PARASITE_CONTROL"|"EXAM"|"OTHER", "descricao": string, "data": "YYYY-MM-DD" }
  }
}

IMPORTANTE: Use "leite_total" quando o produtor falar da produção do rebanho todo, da fazenda, do dia ou sem mencionar animal específico.
Exemplos de leite_total: "a produção de hoje foi 200 litros", "o rebanho produziu 150 litros", "hoje tirei 300 litros no total", "produção do dia 180 litros".
Use "leite" apenas quando mencionar um animal específico (brinco ou nome).

Mapeamento reprodutivo:
- "entrou em cio" / "cio" = ESTRUS
- "inseminada" / "IA" = INSEMINATION
- "monta" / "coberta" = NATURAL_MATING
- "prenha" / "diagnóstico positivo" = PREGNANCY_CHECK_POSITIVE
- "vazia" / "diagnóstico negativo" = PREGNANCY_CHECK_NEGATIVE
- "pariu" / "parto" = CALVING
- "desmamou" = WEANING
- "secou" / "secagem" = DRY_OFF
- "aborto" = ABORTION
- "vacina" / "vacinei" = VACCINATION
- "vermifugação" / "carrapaticida" = PARASITE_CONTROL
- "tratamento" / "antibiótico" = TREATMENT

Retorne somente JSON.`

const TIPO_LABELS: Record<string, string> = {
  leite_total: 'Produção Total do Rebanho',
  leite: 'Produção de Leite (animal)',
  pesagem: 'Pesagem',
  reproducao: 'Evento Reprodutivo',
  sanitario: 'Evento Sanitário',
}

const EVENTO_LABELS: Record<string, string> = {
  ESTRUS: 'Cio', NATURAL_MATING: 'Monta Natural', INSEMINATION: 'Inseminação',
  PREGNANCY_CHECK_POSITIVE: 'Diagnóstico Positivo', PREGNANCY_CHECK_NEGATIVE: 'Diagnóstico Negativo',
  CALVING: 'Parto', WEANING: 'Desmame', DRY_OFF: 'Secagem', ABORTION: 'Aborto',
  VACCINATION: 'Vacinação', TREATMENT: 'Tratamento', PARASITE_CONTROL: 'Controle Parasitário',
  EXAM: 'Exame', OTHER: 'Outro',
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const { getUserPlan, canAccessModule, checkTrialAccess, incrementTrialUsage } = await import('@/lib/plans')
    const plan = await getUserPlan(session.userId)
    if (!canAccessModule(plan, 'ia_voz')) {
      const trial = await checkTrialAccess(session.userId, 'ia_voz')
      if (!trial.allowed) {
        return NextResponse.json({ error: `Você usou seus ${trial.limit} comandos de voz gratuitos de teste. Assine o plano Premium para continuar.`, upgrade: true, trialExhausted: true, module: 'ia_voz', limit: trial.limit }, { status: 403 })
      }
      await incrementTrialUsage(session.userId, 'ia_voz')
    }

    const { texto } = await request.json()
    if (!texto) return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 })
    if (typeof texto !== 'string' || texto.length > 1000) {
      return NextResponse.json({ error: 'Texto muito longo.' }, { status: 400 })
    }

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: texto },
      ],
      response_format: { type: 'json_object' },
    })

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    } catch {
      return NextResponse.json({ error: 'Não consegui interpretar o comando.' }, { status: 422 })
    }

    if (!parsed.tipo || parsed.tipo === 'nao_reconhecido') {
      return NextResponse.json({ error: 'Comando não reconhecido. Tente descrever o que quer registrar.' }, { status: 422 })
    }

    const tagBuscada = parsed.animalTag as string | null
    const nomeBuscado = parsed.animalNome as string | null

    // Busca todos os animais da fazenda para comparar com flexibilidade
    const todosAnimais = await prisma.animal.findMany({
      where: { farmId },
      select: { id: true, name: true, tag: true },
    })

    function normalizar(s: string) {
      return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    }

    let animal = null

    if (tagBuscada) {
      const tagNorm = normalizar(tagBuscada)
      animal = todosAnimais.find((a) =>
        normalizar(a.tag) === tagNorm ||
        normalizar(a.tag) === normalizar(String(parseInt(tagBuscada, 10))) ||
        a.tag === tagBuscada.padStart(4, '0')
      ) ?? null
    }

    if (!animal && nomeBuscado) {
      const nomeNorm = normalizar(nomeBuscado)
      animal = todosAnimais.find((a) =>
        a.name && normalizar(a.name).includes(nomeNorm)
      ) ?? null
    }

    const dados = parsed.dados as Record<string, unknown> ?? {}
    const tipo = parsed.tipo as string

    // Monta resumo legível
    let resumo = TIPO_LABELS[tipo] ?? tipo
    if (tipo === 'leite_total') resumo += ` — ${dados.litros ?? '?'} litros`
    if (tipo === 'leite') resumo += ` — ${dados.litros ?? '?'} litros`
    if (tipo === 'pesagem') resumo += ` — ${dados.peso ?? '?'} kg`
    if (tipo === 'reproducao') resumo += ` — ${EVENTO_LABELS[dados.tipo as string] ?? dados.tipo}`
    if (tipo === 'sanitario') resumo += ` — ${EVENTO_LABELS[dados.tipo as string] ?? dados.tipo}`
    if (dados.data) resumo += ` em ${new Date(dados.data as string).toLocaleDateString('pt-BR')}`

    return NextResponse.json({
      tipo,
      animalTag: tagBuscada,
      animalNome: nomeBuscado,
      animal: animal ? { id: animal.id, nome: animal.name, tag: animal.tag } : null,
      dados,
      resumo,
    })
  } catch (error) {
    console.error('[VOZ INTERPRETAR]', error)
    return NextResponse.json({ error: 'Erro ao interpretar comando.' }, { status: 500 })
  }
}
