import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { FARM_COOKIE_NAME } from '@/lib/farm'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { farmId } = await request.json()
    if (!farmId) return NextResponse.json({ error: 'farmId obrigatório' }, { status: 400 })

    const farm = await prisma.farm.findFirst({
      where: { id: farmId, userId: session.userId },
      select: { id: true, name: true, city: true, state: true },
    })
    if (!farm) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })

    const cookieStore = await cookies()
    cookieStore.set(FARM_COOKIE_NAME, farmId, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    return NextResponse.json({ data: farm })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
