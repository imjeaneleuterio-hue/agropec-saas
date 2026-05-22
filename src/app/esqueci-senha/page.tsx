import { redirect } from 'next/navigation'

export default function EsqueciSenhaPage() {
  redirect('/login?modo=esqueci')
}
