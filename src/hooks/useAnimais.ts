import useSWR from 'swr'
import type { Animal, PaginatedResponse } from '@/types'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Erro ao carregar animais')
  return res.json()
}

interface UseAnimaisOptions {
  page?: number
  limit?: number
  search?: string
  type?: string
  status?: string
  sex?: string
}

export function useAnimais(options: UseAnimaisOptions = {}) {
  const { page = 1, limit = 20, search = '', type, status, sex } = options

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(type && type !== 'ALL' && { type }),
    ...(status && status !== 'ALL' && { status }),
    ...(sex && sex !== 'ALL' && { sex }),
  })

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Animal>>(
    `/api/animais?${params}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    animals: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    error,
    mutate,
  }
}

export function useAnimal(id: string) {
  const { data, error, isLoading, mutate } = useSWR<{ data: Animal }>(
    id ? `/api/animais/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    animal: data?.data,
    isLoading,
    error,
    mutate,
  }
}
