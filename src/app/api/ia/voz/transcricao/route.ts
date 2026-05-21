import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { getSession } from '@/lib/auth'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const { getUserPlan, canAccessModule } = await import('@/lib/plans')
    const plan = await getUserPlan(session.userId)
    if (!canAccessModule(plan, 'ia_voz')) {
      return NextResponse.json({ error: 'Comando de voz disponível no plano Premium.', upgrade: true }, { status: 403 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) return NextResponse.json({ error: 'Arquivo de áudio obrigatório' }, { status: 400 })

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'pt',
      response_format: 'json',
    })

    return NextResponse.json({ texto: transcription.text })
  } catch (error) {
    console.error('[VOZ TRANSCRICAO]', error)
    return NextResponse.json({ error: 'Erro ao transcrever áudio' }, { status: 500 })
  }
}
