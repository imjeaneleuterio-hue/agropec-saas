import useSWR from 'swr'
import type { User } from '@/types'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Not authenticated')
  const data = await res.json()
  return data.data
}

export function useAuth() {
  const { data: user, error, isLoading, mutate } = useSWR<User>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    mutate,
  }
}
