'use client'

import { useState, useRef, useEffect } from 'react'
import { handleTrialResponse, triggerTrialExhausted } from '@/lib/trialEvent'

type Estado = 'idle' | 'gravando' | 'transcrevendo' | 'confirmando' | 'registrando' | 'sucesso' | 'erro'

type Interpretacao = {
  tipo: string
  animal: { id: string; nome: string | null; tag: string } | null
  animalTag: string | null
  animalNome: string | null
  dados: Record<string, unknown>
  resumo: string
}

const TIPO_LABELS: Record<string, string> = {
  leite_total: '🥛 Produção Total do Rebanho',
  leite: '🥛 Leite (animal)',
  pesagem: '⚖️ Pesagem',
  reproducao: '🗓️ Reprodução',
  sanitario: '💉 Sanitário',
}

// tipos que não precisam de animal específico
const SEM_ANIMAL = ['leite_total']

const EXEMPLOS = [
  '🥛 "A vaca 45 produziu 18 litros hoje"',
  '⚖️ "A Mimosa pesou 420 quilos"',
  '🗓️ "A vaca 12 entrou em cio hoje"',
  '🗓️ "Inseminei a vaca 30 com touro Nelore"',
  '💉 "Vacinei a vaca 15 contra aftosa"',
]

export function VoiceButton() {
  const [estado, setEstado] = useState<Estado>('idle')
  const [aberto, setAberto] = useState(false)
  const [trialInfo, setTrialInfo] = useState<{ remaining: number; limit: number } | null>(null)
  const [transcricao, setTranscricao] = useState('')
  const [interpretacao, setInterpretacao] = useState<Interpretacao | null>(null)
  const [erro, setErro] = useState('')
  const [segundos, setSegundos] = useState(0)
  const [confirmacao, setConfirmacao] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/trial/usage?module=ia_voz')
      .then((r) => r.json())
      .then((d) => { if (d.unlocked === false) setTrialInfo({ remaining: d.remaining, limit: d.limit }) })
      .catch(() => {})
  }, [])

  async function iniciarGravacao() {
    setTranscricao('')
    setInterpretacao(null)
    setErro('')
    setSegundos(0)
    setConfirmacao('')
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        pararTimer()
        streamRef.current?.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size < 1000) {
          setEstado('erro')
          setErro('Nenhuma fala capturada. Tente falar mais perto do microfone.')
          return
        }
        await transcreverEInterpretar(blob, mimeType)
      }

      recorder.onerror = () => {
        setEstado('erro')
        setErro('Erro na gravação. Tente novamente.')
      }

      recorder.start(250)
      setEstado('gravando')
      iniciarTimer()
    } catch {
      setEstado('erro')
      setErro('Não foi possível acessar o microfone. Verifique as permissões do navegador.')
    }
  }

  function pararGravacao() {
    mediaRecorderRef.current?.stop()
    setEstado('transcrevendo')
  }

  function iniciarTimer() {
    timerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000)
  }

  function pararTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  async function transcreverEInterpretar(blob: Blob, mimeType: string) {
    setEstado('transcrevendo')
    try {
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
      const formData = new FormData()
      formData.append('audio', new File([blob], `audio.${ext}`, { type: mimeType }))
      const res = await fetch('/api/ia/voz/transcricao', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        if (handleTrialResponse(data)) { setEstado('idle'); return }
        throw new Error(data.error ?? 'Erro ao processar áudio')
      }
      if (data.texto) setTranscricao(data.texto)
      setInterpretacao(data)
      setEstado('confirmando')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado.')
      setEstado('erro')
    }
  }

  async function confirmarRegistro() {
    if (!interpretacao) return
    setEstado('registrando')
    try {
      const res = await fetch('/api/ia/voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: interpretacao.tipo,
          animalId: interpretacao.animal?.id,
          dados: interpretacao.dados,
        }),
      })
      const data = await res.json()
      if (res.ok && data.sucesso) {
        setConfirmacao(data.confirmacao)
        setEstado('sucesso')
      } else {
        setErro(data.error ?? 'Erro ao registrar.')
        setEstado('erro')
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setEstado('erro')
    }
  }

  function fechar() {
    mediaRecorderRef.current?.stop()
    pararTimer()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setAberto(false)
    setEstado('idle')
    setTranscricao('')
    setInterpretacao(null)
    setErro('')
    setSegundos(0)
    setConfirmacao('')
  }

  function novoRegistro() {
    setEstado('idle')
    setTranscricao('')
    setInterpretacao(null)
    setErro('')
    setSegundos(0)
    setConfirmacao('')
  }

  const isLocked = trialInfo !== null && trialInfo.remaining <= 0

  return (
    <>
      <button
        onClick={() => isLocked ? triggerTrialExhausted('ia_voz') : setAberto(true)}
        title={isLocked ? 'Comando de voz — disponível no plano Premium' : 'Registrar por voz'}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-105 active:scale-95 ${
          isLocked ? 'bg-gray-400 hover:bg-gray-500' : 'bg-primary-600 hover:bg-primary-700'
        }`}
      >
        {isLocked ? '🔒' : '🎤'}
      </button>
      {isLocked && (
        <div className="fixed bottom-[5.5rem] right-4 z-40 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 max-w-[180px] text-center shadow-lg pointer-events-none">
          Assine o Premium para usar comandos de voz
        </div>
      )}

      {aberto && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Registrar por Voz</h3>
                <p className="text-xs text-gray-400 mt-0.5">Fale e a IA registra automaticamente</p>
              </div>
              <button onClick={fechar} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-5 space-y-4">

              {/* Idle: exemplos */}
              {estado === 'idle' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Exemplos</p>
                  {EXEMPLOS.map((ex) => (
                    <p key={ex} className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">{ex}</p>
                  ))}
                </div>
              )}

              {/* Gravando */}
              {estado === 'gravando' && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center relative">
                      <span className="text-4xl">🎤</span>
                      <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-600">● Gravando</p>
                    <p className="text-xs text-gray-400 mt-0.5">{segundos}s — fale naturalmente</p>
                  </div>
                </div>
              )}

              {/* Transcrevendo / Interpretando */}
              {estado === 'transcrevendo' && (
                <div className="text-center space-y-3 py-4">
                  <div className="text-3xl animate-spin inline-block">⏳</div>
                  <p className="text-sm font-medium text-gray-700">Transcrevendo e interpretando...</p>
                </div>
              )}

              {/* Confirmação */}
              {estado === 'confirmando' && interpretacao && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">O que você disse</p>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 italic">
                    "{transcricao}"
                  </div>

                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">O que a IA entendeu</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-blue-800">{TIPO_LABELS[interpretacao.tipo] ?? interpretacao.tipo}</span>
                    </div>
                    <p className="text-sm text-blue-700">{interpretacao.resumo}</p>
                    {SEM_ANIMAL.includes(interpretacao.tipo) ? (
                      <p className="text-sm text-blue-600">Rebanho inteiro — sem animal específico</p>
                    ) : interpretacao.animal ? (
                      <p className="text-sm text-blue-700">
                        Animal: <b>{interpretacao.animal.nome ?? `Brinco #${interpretacao.animal.tag}`}</b>
                        {interpretacao.animal.nome && <span className="text-blue-500"> — #{interpretacao.animal.tag}</span>}
                      </p>
                    ) : (
                      <p className="text-sm text-red-600 font-medium">
                        ⚠️ Animal não encontrado
                        {interpretacao.animalTag && ` (brinco ${interpretacao.animalTag})`}
                        {interpretacao.animalNome && ` (nome: ${interpretacao.animalNome})`}
                      </p>
                    )}
                  </div>

                  {!SEM_ANIMAL.includes(interpretacao.tipo) && !interpretacao.animal && (
                    <p className="text-xs text-gray-400">Verifique o número do brinco e tente novamente.</p>
                  )}
                </div>
              )}

              {/* Registrando */}
              {estado === 'registrando' && (
                <div className="text-center space-y-3 py-4">
                  <div className="text-3xl animate-spin inline-block">⏳</div>
                  <p className="text-sm font-medium text-gray-700">Salvando registro...</p>
                </div>
              )}

              {/* Sucesso */}
              {estado === 'sucesso' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="font-semibold text-green-800">Registrado com sucesso!</p>
                      <p className="text-sm text-green-700 mt-0.5">{confirmacao}</p>
                    </div>
                  </div>
                  {transcricao && <p className="text-xs text-gray-400 italic">"{transcricao}"</p>}
                </div>
              )}

              {/* Erro */}
              {estado === 'erro' && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <span className="text-2xl">❌</span>
                  <div>
                    <p className="font-semibold text-red-800">Não consegui registrar</p>
                    <p className="text-sm text-red-700 mt-0.5">{erro}</p>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-5 pb-5 space-y-2">
              {estado === 'idle' && (
                <button onClick={iniciarGravacao} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                  🎤 Iniciar Gravação
                </button>
              )}
              {estado === 'gravando' && (
                <button onClick={pararGravacao} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                  ⏹ Parar e Enviar
                </button>
              )}
              {estado === 'confirmando' && (
                <div className="flex gap-3">
                  <button
                    onClick={confirmarRegistro}
                    disabled={!interpretacao || (!SEM_ANIMAL.includes(interpretacao.tipo) && !interpretacao.animal)}
                    className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ✓ Confirmar Registro
                  </button>
                  <button onClick={novoRegistro} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-sm">
                    🎤 Tentar Novamente
                  </button>
                </div>
              )}
              {(estado === 'sucesso' || estado === 'erro') && (
                <div className="flex gap-3">
                  <button onClick={novoRegistro} className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors text-sm">
                    🎤 Novo Registro
                  </button>
                  <button onClick={fechar} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-sm">
                    Fechar
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
