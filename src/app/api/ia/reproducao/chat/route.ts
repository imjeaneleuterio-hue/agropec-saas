import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { getSession } from '@/lib/auth'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { mensagem, historico, contextoAnimal } = await request.json()
    if (!mensagem) return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 })
    if (typeof mensagem !== 'string' || mensagem.length > 2000) {
      return NextResponse.json({ error: 'Mensagem muito longa.' }, { status: 400 })
    }

    const contextoSanitizado = typeof contextoAnimal === 'string'
      ? contextoAnimal.slice(0, 5000)
      : ''

    const systemPrompt = `Você é um especialista em reprodução bovina para pecuária brasileira.
O produtor acabou de receber uma análise reprodutiva do seguinte animal e pode fazer perguntas sobre ela.

Contexto do animal e análise gerada:
${contextoSanitizado}

Diretrizes:
- Responda SEMPRE em português brasileiro
- Seja direto, claro e objetivo para o produtor rural
- Baseie suas respostas nos dados do animal e na análise fornecida
- Use datas específicas quando possível
- Considere: gestação ~280 dias, ciclo estral ~21 dias, cio dura 12-18 horas
- SEMPRE recomende veterinário para diagnóstico e tratamento definitivo`

    const historicoLimitado = (Array.isArray(historico) ? historico.slice(-20) : [])
      .filter((m: unknown) => m && typeof (m as Record<string, unknown>).content === 'string')
      .map((m: { role: string; content: string }) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: (m.content as string).slice(0, 2000),
      }))

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...historicoLimitado,
      { role: 'user' as const, content: mensagem },
    ]

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    console.error('[IA REPRODUCAO CHAT]', error)
    return NextResponse.json({ error: 'Erro ao processar pergunta' }, { status: 500 })
  }
}
