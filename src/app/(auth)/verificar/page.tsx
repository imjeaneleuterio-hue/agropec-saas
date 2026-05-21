'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function VerificarContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      window.location.replace(`/api/auth/verificar?token=${encodeURIComponent(token)}`)
    } else {
      window.location.replace('/login?verified=error')
    }
  }, [token])

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Verificando seu e-mail...</p>
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
