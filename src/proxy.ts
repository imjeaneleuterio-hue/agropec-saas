import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-in-production-32ch'
)

const PUBLIC_PATHS = ['/', '/login', '/cadastro', '/api/auth/login', '/api/auth/register']
const AUTH_PATHS = ['/login', '/cadastro']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('jeleupec_token')?.value

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith('/api/auth/'))
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p))

  if (isPublic && !isAuthPath) return NextResponse.next()

  if (!token) {
    if (isAuthPath) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret)

    if (isAuthPath) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/admin') && payload.role !== 'SUPER_ADMIN' && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  } catch {
    if (isAuthPath) return NextResponse.next()
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('jeleupec_token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
}
