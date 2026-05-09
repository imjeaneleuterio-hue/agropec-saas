import { cookies } from 'next/headers'
import { prisma } from './prisma'

const FARM_COOKIE = 'jeleupec_farm'

export async function getActiveFarmId(userId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const selected = cookieStore.get(FARM_COOKIE)?.value

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { farms: { select: { id: true }, orderBy: { createdAt: 'asc' } } },
  })

  const ids = user?.farms.map((f) => f.id) ?? []
  if (ids.length === 0) return null
  if (selected && ids.includes(selected)) return selected
  return ids[0]
}

export async function getUserFarms(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      farms: {
        select: { id: true, name: true, city: true, state: true, type: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  return user?.farms ?? []
}

export const FARM_COOKIE_NAME = FARM_COOKIE
