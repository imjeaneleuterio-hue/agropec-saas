'use client'

import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(ok)
    if (ok) {
      setPermission(Notification.permission)
      checkSubscription()
    }
  }, [])

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch {
      // browser may block in insecure context
    }
  }

  async function subscribe() {
    setLoading(true)
    setError('')
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setError('Permissão de notificação negada.')
        setLoading(false)
        return
      }

      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      const keyRes = await fetch('/api/push/vapid-key')
      const { publicKey } = await keyRes.json()

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })

      setSubscribed(true)
    } catch (err) {
      setError('Erro ao ativar notificações. Tente novamente.')
      console.error('[PUSH SUBSCRIBE]', err)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    setError('')
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      setError('Erro ao desativar notificações.')
      console.error('[PUSH UNSUBSCRIBE]', err)
    } finally {
      setLoading(false)
    }
  }

  return { supported, subscribed, permission, loading, error, subscribe, unsubscribe }
}
