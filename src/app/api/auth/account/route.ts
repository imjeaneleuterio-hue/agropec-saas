import { NextResponse } from 'next/server'
import { getSession, clearAuthCookie } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { password } = await request.json()
    if (!password) return NextResponse.json({ error: 'Senha obrigatória para confirmar exclusão.' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })

    await prisma.user.delete({ where: { id: user.id } })

    const response = NextResponse.json({ message: 'Conta excluída com sucesso.' })
    await clearAuthCookie()
    return response
  } catch (error) {
    console.error('[DELETE ACCOUNT]', error)
    return NextResponse.json({ error: 'Erro ao excluir conta.' }, { status: 500 })
  }
}
