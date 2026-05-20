'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { STATES_BR } from '@/lib/utils'

export default function CadastroPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', cpf: '',
    farmName: '', farmCity: '', farmState: 'GO', farmType: 'MIXED' as const,
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao cadastrar'); return }
      setEmailEnviado(form.email)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (emailEnviado) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h2>
          <p className="text-gray-600 text-sm mb-2">
            Enviamos um link de confirmação para:
          </p>
          <p className="font-semibold text-primary-700 mb-6">{emailEnviado}</p>
          <p className="text-gray-500 text-xs mb-6">
            Clique no link do e-mail para ativar sua conta. Verifique também a caixa de spam.
          </p>
          <Link href="/login" className="btn-secondary py-2.5 px-6 text-sm">
            Já confirmei — ir para login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Criar conta grátis</h1>
          <p className="text-gray-500 text-sm mt-1">
            Etapa {step} de 2 — {step === 1 ? 'Seus dados' : 'Sua fazenda'}
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-primary-600' : 'bg-gray-200'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="label">Nome completo *</label>
                <input required placeholder="João Silva" className="input-field"
                  value={form.name} onChange={(e) => update('name', e.target.value)} />
              </div>
              <div>
                <label className="label">E-mail *</label>
                <input required type="email" placeholder="joao@fazenda.com.br" className="input-field"
                  value={form.email} onChange={(e) => update('email', e.target.value)} />
              </div>
              <div>
                <label className="label">Senha *</label>
                <input required type="password" placeholder="Mínimo 6 caracteres" className="input-field"
                  value={form.password} onChange={(e) => update('password', e.target.value)} minLength={6} />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input placeholder="(62) 99999-9999" className="input-field"
                  value={form.phone} onChange={(e) => update('phone', e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="label">Nome da Fazenda *</label>
                <input required placeholder="Fazenda São João" className="input-field"
                  value={form.farmName} onChange={(e) => update('farmName', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Cidade *</label>
                  <input required placeholder="Rio Verde" className="input-field"
                    value={form.farmCity} onChange={(e) => update('farmCity', e.target.value)} />
                </div>
                <div>
                  <label className="label">Estado *</label>
                  <select required className="input-field" value={form.farmState} onChange={(e) => update('farmState', e.target.value)}>
                    {STATES_BR.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Tipo de Pecuária *</label>
                <select required className="input-field" value={form.farmType} onChange={(e) => update('farmType', e.target.value)}>
                  <option value="DAIRY">Pecuária Leiteira</option>
                  <option value="BEEF">Pecuária de Corte</option>
                  <option value="MIXED">Mista (Leite + Corte)</option>
                </select>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">
                Voltar
              </button>
            )}
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 text-base">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando conta...
                </span>
              ) : step === 1 ? 'Continuar' : 'Criar minha conta'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Já tem conta?{' '}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
