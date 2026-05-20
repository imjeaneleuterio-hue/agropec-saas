'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao enviar.'); return }
      setEnviado(true)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        {enviado ? (
          <div className="text-center">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h2>
            <p className="text-gray-500 text-sm mb-6">
              Se este e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.
            </p>
            <Link href="/login" className="btn-secondary py-2.5 px-6 text-sm">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Esqueceu a senha?</h1>
              <p className="text-gray-500 text-sm mt-2">Digite seu e-mail e enviaremos um link para redefinir</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : 'Enviar link de redefinição'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Lembrou a senha?{' '}
              <Link href="/login" className="text-primary-600 font-medium hover:underline">Entrar</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
