'use client'

import { useState, useRef, useEffect } from 'react'
import { handleTrialResponse } from '@/lib/trialEvent'

type Tab = 'saude' | 'reproducao'

type Mensagem = {
  role: 'user' | 'assistant'
  content: string
}

type Animal = {
  id: string
  tag: string
  name?: string
  breed: string
  sex: string
  type: string
  status: string
}

export default function IAPage() {
  const [tab, setTab] = useState<Tab>('saude')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">IA Veterinária</h1>
        <p className="text-gray-500 text-sm mt-1">
          Diagnóstico de doenças e análise reprodutiva com inteligência artificial
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('saude')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'saude'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🩺 Diagnóstico de Doenças
        </button>
        <button
          onClick={() => setTab('reproducao')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'reproducao'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🐄 Análise de Prenhez e Cio
        </button>
      </div>

      {tab === 'saude' ? <TabSaude /> : <TabReproducao />}
    </div>
  )
}

/* ─── Tab: Diagnóstico de Doenças ─── */
function TabSaude() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      role: 'assistant',
      content:
        'Olá! Sou seu assistente veterinário virtual. Descreva os sintomas que o animal está apresentando e farei uma análise dos possíveis diagnósticos. Lembre-se que esta análise é orientativa e não substitui a consulta presencial com um médico veterinário.',
    },
  ])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function enviar() {
    const texto = input.trim()
    if (!texto || carregando) return

    const novasMensagens: Mensagem[] = [
      ...mensagens,
      { role: 'user', content: texto },
    ]
    setMensagens(novasMensagens)
    setInput('')
    setCarregando(true)

    const idx = novasMensagens.length
    setMensagens([...novasMensagens, { role: 'assistant', content: '' }])

    try {
      const historico = novasMensagens.slice(1).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/ia/saude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: texto, historico }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (handleTrialResponse(errData)) return
        throw new Error(errData.error ?? 'Erro na API')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let resposta = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        resposta += decoder.decode(value, { stream: true })
        setMensagens((prev) => {
          const copia = [...prev]
          copia[idx] = { role: 'assistant', content: resposta }
          return copia
        })
      }
    } catch {
      setMensagens((prev) => {
        const copia = [...prev]
        copia[idx] = {
          role: 'assistant',
          content: 'Erro ao obter resposta. Verifique a configuração da API.',
        }
        return copia
      })
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex flex-col h-[70vh] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensagens.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
                IA
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}
            >
              {m.content || (
                <span className="flex gap-1 items-center text-gray-400">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce [animation-delay:0.1s]">●</span>
                  <span className="animate-bounce [animation-delay:0.2s]">●</span>
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 p-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              enviar()
            }
          }}
          placeholder="Descreva os sintomas do animal... (ex: vaca com febre, diarreia e não está comendo há 2 dias)"
          className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          rows={2}
          disabled={carregando}
        />
        <button
          onClick={enviar}
          disabled={carregando || !input.trim()}
          className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          {carregando ? '...' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}

/* ─── Tab: Análise de Prenhez e Cio ─── */
function TabReproducao() {
  const [animais, setAnimais] = useState<Animal[]>([])
  const [animalId, setAnimalId] = useState('')
  const [analise, setAnalise] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [carregandoAnimais, setCarregandoAnimais] = useState(true)

  // Chat após análise
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [inputChat, setInputChat] = useState('')
  const [carregandoChat, setCarregandoChat] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/animais?limit=100&sex=FEMALE')
      .then((r) => r.json())
      .then((d) => setAnimais(d.data ?? []))
      .finally(() => setCarregandoAnimais(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function analisar() {
    if (!animalId || carregando) return
    setCarregando(true)
    setAnalise('')
    setMensagens([])

    try {
      const res = await fetch('/api/ia/reproducao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animalId }),
      })
      const dados = await res.json()
      if (res.ok) {
        setAnalise(dados.analise)
        setMensagens([{ role: 'assistant', content: dados.analise }])
      } else {
        if (handleTrialResponse(dados)) return
        setAnalise(`Erro: ${dados.error}`)
      }
    } catch {
      setAnalise('Erro ao conectar com a IA.')
    } finally {
      setCarregando(false)
    }
  }

  async function enviarPergunta() {
    const texto = inputChat.trim()
    if (!texto || carregandoChat) return

    const novasMensagens: Mensagem[] = [
      ...mensagens,
      { role: 'user', content: texto },
    ]
    setMensagens(novasMensagens)
    setInputChat('')
    setCarregandoChat(true)

    const idx = novasMensagens.length
    setMensagens([...novasMensagens, { role: 'assistant', content: '' }])

    try {
      const historico = novasMensagens.slice(1).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/ia/reproducao/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: texto,
          historico,
          contextoAnimal: analise,
        }),
      })

      if (!res.ok) throw new Error('Erro na API')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let resposta = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        resposta += decoder.decode(value, { stream: true })
        setMensagens((prev) => {
          const copia = [...prev]
          copia[idx] = { role: 'assistant', content: resposta }
          return copia
        })
      }
    } catch {
      setMensagens((prev) => {
        const copia = [...prev]
        copia[idx] = {
          role: 'assistant',
          content: 'Erro ao obter resposta. Tente novamente.',
        }
        return copia
      })
    } finally {
      setCarregandoChat(false)
    }
  }

  const animalSelecionado = animais.find((a) => a.id === animalId)

  return (
    <div className="space-y-4">
      {/* Seleção de animal */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Selecionar Animal</h2>
        <div className="flex gap-3 flex-wrap">
          <select
            value={animalId}
            onChange={(e) => { setAnimalId(e.target.value); setAnalise(''); setMensagens([]) }}
            disabled={carregandoAnimais}
            className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">
              {carregandoAnimais ? 'Carregando animais...' : '-- Selecione uma fêmea --'}
            </option>
            {animais.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.tag} {a.name ? `— ${a.name}` : ''} ({a.breed})
              </option>
            ))}
          </select>
          <button
            onClick={analisar}
            disabled={!animalId || carregando}
            className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {carregando ? 'Analisando...' : '🔍 Analisar'}
          </button>
        </div>

        {animalSelecionado && (
          <div className="mt-3 flex gap-4 text-xs text-gray-500 flex-wrap">
            <span>Raça: <b className="text-gray-700">{animalSelecionado.breed}</b></span>
            <span>Tipo: <b className="text-gray-700">Leiteira</b></span>
            <span>Status: <b className="text-gray-700">{animalSelecionado.status}</b></span>
          </div>
        )}
      </div>

      {/* Chat com análise + perguntas */}
      {(carregando || mensagens.length > 0) && (
        <div className="flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{ minHeight: '400px' }}>
          {/* Cabeçalho */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              IA
            </div>
            <div>
              <div className="font-semibold text-gray-800 text-sm">Análise Reprodutiva</div>
              <div className="text-xs text-gray-400">Faça perguntas sobre o animal após a análise</div>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '50vh' }}>
            {carregando ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <span className="animate-spin">⏳</span>
                Analisando histórico reprodutivo do animal...
              </div>
            ) : (
              mensagens.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
                      IA
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-primary-600 text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    }`}
                  >
                    {m.content || (
                      <span className="flex gap-1 items-center text-gray-400">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce [animation-delay:0.1s]">●</span>
                        <span className="animate-bounce [animation-delay:0.2s]">●</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Aviso */}
          <div className="mx-4 mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            ⚠️ Análise orientativa por IA. Consulte sempre um médico veterinário.
          </div>

          {/* Input de perguntas */}
          {!carregando && analise && (
            <div className="border-t border-gray-100 p-3 flex gap-2">
              <textarea
                value={inputChat}
                onChange={(e) => setInputChat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    enviarPergunta()
                  }
                }}
                placeholder="Faça uma pergunta sobre este animal... (ex: quando devo fazer o exame de prenhez?)"
                className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={2}
                disabled={carregandoChat}
              />
              <button
                onClick={enviarPergunta}
                disabled={carregandoChat || !inputChat.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {carregandoChat ? '...' : 'Enviar'}
              </button>
            </div>
          )}
        </div>
      )}

      {!animalId && mensagens.length === 0 && (
        <div className="bg-gradient-to-br from-primary-50 to-white rounded-2xl border border-primary-100 p-8 text-center">
          <div className="text-4xl mb-3">🐄</div>
          <h3 className="font-semibold text-gray-700 mb-2">Análise de Prenhez e Cio</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Selecione uma fêmea do rebanho. A IA analisará o histórico reprodutivo, indicará
            o status atual e a previsão do próximo cio. Depois, tire suas dúvidas diretamente no chat.
          </p>
        </div>
      )}
    </div>
  )
}
