'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function RedefinirContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao redefinir.'); return }
      setSucesso(true)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h2>
        <Link href="/esqueci-senha" className="btn-secondary py-2.5 px-6 text-sm">Solicitar novo link</Link>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Senha redefinida!</h2>
        <p className="text-gray-500 text-sm mb-6">Agora você pode fazer login com sua nova senha.</p>
        <Link href="/login" className="btn-primary py-3 px-8">Fazer login</Link>
      </div>
    )
  }

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nova senha</h1>
        <p className="text-gray-500 text-sm mt-2">Escolha uma nova senha para sua conta</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nova senha</label>
          <input type="password" required minLength={6} placeholder="Mínimo 6 caracteres"
            className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="label">Confirmar nova senha</label>
          <input type="password" required placeholder="Repita a senha"
            className="input-field" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvando...
            </span>
          ) : 'Redefinir senha'}
        </button>
      </form>
    </>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <Suspense>
          <RedefinirContent />
        </Suspense>
      </div>
    </div>
  )
}
