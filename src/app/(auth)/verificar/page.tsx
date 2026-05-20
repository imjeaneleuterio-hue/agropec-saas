'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function VerificarContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'sucesso' | 'erro'>('loading')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('erro')
      setMensagem('Link inválido.')
      return
    }
    fetch(`/api/auth/verificar?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.message) {
          setStatus('sucesso')
          setMensagem(data.message)
        } else {
          setStatus('erro')
          setMensagem(data.error ?? 'Erro ao verificar.')
        }
      })
      .catch(() => {
        setStatus('erro')
        setMensagem('Erro de conexão.')
      })
  }, [token])

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Verificando seu e-mail...</p>
          </>
        )}
        {status === 'sucesso' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">E-mail confirmado!</h2>
            <p className="text-gray-600 text-sm mb-6">{mensagem}</p>
            <Link href="/login" className="btn-primary py-3 px-8">
              Fazer login
            </Link>
          </>
        )}
        {status === 'erro' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ops!</h2>
            <p className="text-gray-600 text-sm mb-6">{mensagem}</p>
            <Link href="/cadastro" className="btn-secondary py-3 px-8">
              Criar nova conta
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerificarPage() {
  return (
    <Suspense>
      <VerificarContent />
    </Suspense>
  )
}
