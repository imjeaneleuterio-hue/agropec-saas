import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const base = new URL('/', request.url).toString().replace(/\/$/, '')

  if (!token) {
    return NextResponse.redirect(`${base}/login?verified=error`)
  }

  try {
    const user = await prisma.user.findUnique({ where: { verificationToken: token } })

    if (!user) {
      return NextResponse.redirect(`${base}/login?verified=invalid`)
    }

    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      return NextResponse.redirect(`${base}/login?verified=expired`)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    })

    return NextResponse.redirect(`${base}/login?verified=1`)
  } catch (error) {
    console.error('[VERIFICAR]', error)
    return NextResponse.redirect(`${base}/login?verified=error`)
  }
}
