import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  current: z.string().min(1, 'Senha atual obrigatória'),
  next: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirm: z.string(),
}).refine((d) => d.next === d.confirm, {
  message: 'As senhas não conferem',
  path: ['confirm'],
})

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { password: true } })
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const valid = await bcrypt.compare(parsed.data.current, user.password)
    if (!valid) return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })

    const hashed = await bcrypt.hash(parsed.data.next, 12)
    await prisma.user.update({ where: { id: session.userId }, data: { password: hashed } })

    return NextResponse.json({ message: 'Senha alterada com sucesso' })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
