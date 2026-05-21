import { prisma } from './prisma'

export type PlanKey = 'FREE' | 'PRO' | 'PREMIUM'

export const PLANS = {
  FREE: {
    key: 'FREE' as PlanKey,
    name: 'Gratuito',
    price: 0,
    animalLimit: 5,
    lockedModules: ['reproducao', 'sanitario', 'financeiro', 'relatorios', 'ia', 'ia_voz'],
  },
  PRO: {
    key: 'PRO' as PlanKey,
    name: 'Pro',
    price: 1,
    animalLimit: 200,
    lockedModules: ['ia_voz'],
  },
  PREMIUM: {
    key: 'PREMIUM' as PlanKey,
    name: 'Premium',
    price: 1,
    animalLimit: null,
    lockedModules: [],
  },
} as const

export async function getUserPlan(userId: string): Promise<PlanKey> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, subscription: true },
  })
  if (!user) return 'FREE'
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return 'PREMIUM'
  const sub = user.subscription
  if (!sub || (sub.status !== 'ACTIVE' && sub.status !== 'CANCELLED')) return 'FREE'
  if (sub.endDate && sub.endDate < new Date()) return 'FREE'
  const plan = sub.plan as PlanKey
  if (plan !== 'PRO' && plan !== 'PREMIUM') return 'FREE'
  return plan
}

export function canAccessModule(plan: PlanKey, module: string): boolean {
  return !PLANS[plan].lockedModules.includes(module as never)
}

export function getAnimalLimit(plan: PlanKey): number | null {
  return PLANS[plan].animalLimit
}

export const TRIAL_LIMITS: Record<string, number> = {
  reproducao: 3,
  sanitario: 5,
  financeiro: 5,
  relatorios: 3,
  ia: 5,
  ia_voz: 3,
}

export async function checkTrialAccess(
  userId: string,
  module: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = TRIAL_LIMITS[module] ?? 0
  if (limit === 0) return { allowed: false, used: 0, limit: 0 }
  const usage = await prisma.trialUsage.findUnique({
    where: { userId_module: { userId, module } },
  })
  const used = usage?.count ?? 0
  return { allowed: used < limit, used, limit }
}

export async function incrementTrialUsage(userId: string, module: string): Promise<void> {
  await prisma.trialUsage.upsert({
    where: { userId_module: { userId, module } },
    update: { count: { increment: 1 } },
    create: { userId, module, count: 1 },
  })
}
