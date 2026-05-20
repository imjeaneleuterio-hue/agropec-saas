import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { getSession } from '@/lib/auth'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })

const SYSTEM_PROMPT = `Você é um assistente veterinário especializado em bovinos para pecuária brasileira.
Sua função é ajudar produtores rurais a identificar possíveis doenças em seus animais com base nos sintomas relatados.

Diretrizes:
- Responda SEMPRE em português brasileiro
- Seja direto e objetivo
- Liste as possíveis doenças em ordem de probabilidade
- Para cada doença, explique: sintomas típicos, causa provável, e o que fazer
- SEMPRE recomende consulta com médico veterinário para diagnóstico e tratamento definitivo
- Mencione se é urgente ou se pode aguardar consulta rotineira
- Considere doenças comuns no Brasil: aftosa, brucelose, tristeza parasitária, carbúnculo, botulismo, mastite, leptospirose, etc.
- Se os sintomas indicarem emergência (morte súbita, convulsões, dificuldade respiratória grave), destaque isso claramente`

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { mensagem, historico } = await request.json()
    if (!mensagem) return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 })

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...(historico ?? []).map((m: { role: string; content: string }) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.content,
      })),
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
    console.error('[IA SAUDE]', error)
    return NextResponse.json({ error: 'Erro ao processar análise' }, { status: 500 })
  }
}
