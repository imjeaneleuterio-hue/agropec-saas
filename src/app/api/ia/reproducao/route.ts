import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveFarmId } from '@/lib/farm'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { animalId } = await request.json()
    if (!animalId) return NextResponse.json({ error: 'Animal obrigatório' }, { status: 400 })

    const farmId = await getActiveFarmId(session.userId)
    if (!farmId) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })

    const animal = await prisma.animal.findFirst({
      where: { id: animalId, farmId },
      include: {
        reproductiveEvents: { orderBy: { date: 'desc' }, take: 20 },
        milkProductions: { orderBy: { date: 'desc' }, take: 7 },
        weightRecords: { orderBy: { date: 'asc' }, take: 5 },
      },
    })

    if (!animal) return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 })

    const hoje = new Date()
    const nascimento = animal.birthDate
      ? `${Math.floor((hoje.getTime() - new Date(animal.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))} anos`
      : 'desconhecida'

    const eventos = animal.reproductiveEvents.map((e) => ({
      tipo: e.type,
      data: new Date(e.date).toLocaleDateString('pt-BR'),
      touro: e.bullName ?? '',
      previsaoParto: e.expectedCalving ? new Date(e.expectedCalving).toLocaleDateString('pt-BR') : '',
      resultado: e.result ?? '',
      obs: e.notes ?? '',
    }))

    const ultimaProducao = animal.milkProductions[0]
    const pesoAtual = animal.weightRecords[animal.weightRecords.length - 1]

    const contexto = `
Animal: ${animal.name ?? 'Sem nome'} | Brinco: ${animal.tag}
Raça: ${animal.breed} | Tipo: ${animal.type === 'DAIRY' ? 'Leite' : 'Corte'}
Idade: ${nascimento} | Status: ${animal.status}
Peso: ${pesoAtual ? `${pesoAtual.weight} kg` : 'não registrado'}
Produção leiteira recente: ${ultimaProducao ? `${ultimaProducao.totalLiters}L/dia` : 'não registrada'}

Histórico reprodutivo (${eventos.length} eventos):
${eventos.length === 0
  ? 'Nenhum evento reprodutivo registrado.'
  : eventos.map((e) =>
      `- ${e.data}: ${e.tipo}${e.touro ? ` (touro: ${e.touro})` : ''}${e.previsaoParto ? ` | Previsão parto: ${e.previsaoParto}` : ''}${e.resultado ? ` | Resultado: ${e.resultado}` : ''}${e.obs ? ` | ${e.obs}` : ''}`
    ).join('\n')}
    `.trim()

    const systemPrompt = `Você é um especialista em reprodução bovina para pecuária brasileira.
Analise os dados do animal e forneça em português brasileiro:

1. **Status reprodutivo atual** — prenhe, em cio, vazia ou aguardando exame
2. **Análise detalhada** — baseada no histórico reprodutivo
3. **Previsão do próximo cio** — calcule a data provável do próximo cio com base no último evento reprodutivo (inseminação, monta, diagnóstico de vazia, etc.). Se o animal estiver prenhe, informe quando o cio retornará após o parto esperado (~21 dias pós-parto para retorno ao cio). Se vazia, calcule ~21 dias a partir do último evento registrado. Seja específico: informe a data estimada.
4. **Próximos passos** — ações concretas para o produtor (quando observar cio, quando realizar diagnóstico de gestação, etc.)
5. **Alertas** — se houver algo preocupante (anestro prolongado, falhas repetidas, intervalo entre partos elevado, etc.)

Regras importantes:
- Gestação bovina: ~280 dias (9 meses e 9 dias)
- Ciclo estral: ~21 dias (variação de 18 a 24 dias)
- Duração do cio: 12 a 18 horas
- Diagnóstico de gestação por ultrassom: a partir de 25-30 dias após a cobertura
- Retorno ao cio pós-parto: mínimo 21-30 dias, mas recomenda-se aguardar 45-60 dias
Seja claro, objetivo e use datas específicas para o produtor rural.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contexto },
      ],
    })

    const texto = completion.choices[0]?.message?.content ?? ''

    return NextResponse.json({
      analise: texto,
      animal: {
        id: animal.id,
        nome: animal.name,
        tag: animal.tag,
        raca: animal.breed,
        totalEventos: eventos.length,
      },
    })
  } catch (error) {
    console.error('[IA REPRODUCAO]', error)
    return NextResponse.json({ error: 'Erro ao analisar reprodução' }, { status: 500 })
  }
}
