'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const verified = searchParams.get('verified')
  const [modo, setModo] = useState<'login' | 'esqueci' | 'redefinir'>(token ? 'redefinir' : 'login')
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao fazer login'); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleEsqueci(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao enviar.'); return }
      setEmailEnviado(true)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRedefinir(e: React.FormEvent) {
    e.preventDefault()
    if (novaSenha !== confirmarSenha) { setError('As senhas não coincidem.'); return }
    if (novaSenha.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: novaSenha }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao redefinir.'); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl p-8">

        {/* Login */}
        {modo === 'login' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta!</h1>
              <p className="text-gray-500 text-sm mt-2">Entre na sua conta J.ELEUPEC</p>
            </div>
            {verified === '1' && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                ✅ E-mail confirmado! Agora é só entrar.
              </div>
            )}
            {verified === 'invalid' && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                Link inválido ou já utilizado. Tente criar uma nova conta.
              </div>
            )}
            {verified === 'expired' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                Link expirado (24h). Crie uma nova conta para receber um novo link.
              </div>
            )}
            {verified === 'error' && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                Erro ao confirmar e-mail. Tente novamente.
              </div>
            )}
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">E-mail</label>
                <input type="email" required placeholder="seu@email.com" className="input-field"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Senha</label>
                <input type="password" required placeholder="••••••••" className="input-field"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Entrando...</span> : 'Entrar'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => { setModo('esqueci'); setError(''); setEmailEnviado(false) }}
                className="text-sm text-primary-600 hover:underline">
                Esqueceu sua senha?
              </button>
            </div>
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-600">
                Não tem conta?{' '}
                <Link href="/cadastro" className="text-primary-600 font-medium hover:underline">Cadastre-se grátis</Link>
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center mb-3">Demo — use as credenciais:</p>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <p><span className="font-medium">E-mail:</span> demo@jeleupec.com</p>
                <p><span className="font-medium">Senha:</span> demo123</p>
              </div>
            </div>
          </>
        )}

        {/* Esqueci a senha */}
        {modo === 'esqueci' && (
          <>
            {emailEnviado ? (
              <div className="text-center">
                <div className="text-5xl mb-4">📧</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">E-mail enviado!</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Se este e-mail estiver cadastrado, você receberá as instruções em breve. Verifique também o spam.
                </p>
                <button type="button" onClick={() => { setModo('login'); setEmailEnviado(false) }}
                  className="btn-secondary py-2.5 px-6 text-sm">
                  Voltar para o login
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Esqueceu a senha?</h1>
                  <p className="text-gray-500 text-sm mt-2">Digite seu e-mail para receber o link de redefinição</p>
                </div>
                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                <form onSubmit={handleEsqueci} className="space-y-4">
                  <div>
                    <label className="label">E-mail</label>
                    <input type="email" required placeholder="seu@email.com" className="input-field"
                      value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                    {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enviando...</span> : 'Enviar link'}
                  </button>
                </form>
                <div className="mt-4 text-center">
                  <button type="button" onClick={() => { setModo('login'); setError('') }}
                    className="text-sm text-gray-500 hover:underline">← Voltar para o login</button>
                </div>
              </>
            )}
          </>
        )}

        {/* Redefinir senha (via link do email) */}
        {modo === 'redefinir' && (
          <>
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Nova senha</h1>
                <p className="text-gray-500 text-sm mt-2">Escolha uma nova senha para sua conta</p>
              </div>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <form onSubmit={handleRedefinir} className="space-y-4">
                <div>
                  <label className="label">Nova senha</label>
                  <input type="password" required minLength={6} placeholder="Mínimo 6 caracteres" className="input-field"
                    value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
                </div>
                <div>
                  <label className="label">Confirmar nova senha</label>
                  <input type="password" required placeholder="Repita a senha" className="input-field"
                    value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</span> : 'Redefinir senha'}
                </button>
              </form>
            </>
          </>
        )}

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
