'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { OtpInput } from '@/components/ui/otp-input'

const OTP_LENGTH = 6

type Status = 'idle' | 'sending' | 'sent' | 'verifying' | 'error'

/**
 * Login do platform admin por OTP code-only. O email traz um código de 6
 * dígitos ({{ .Token }} no template magic_link) — sem magic link, sem
 * dependência de redirect URL allowlist. Espelha o staff login.
 */
export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    setStatus('sent')
  }

  async function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (code.length !== OTP_LENGTH) {
      setErrorMsg(`O código tem ${OTP_LENGTH} dígitos.`)
      return
    }
    setStatus('verifying')
    setErrorMsg(null)

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'email',
    })

    if (error) {
      setStatus('sent')
      setErrorMsg('Código inválido ou expirado. Confira no email ou peça outro.')
      return
    }

    // Sessão criada — força reload pra layout autenticado validar a role.
    router.replace('/dashboard')
    router.refresh()
  }

  if (status === 'sent' || status === 'verifying') {
    return (
      <div className="space-y-4">
        <p className="text-[0.875rem] leading-relaxed text-fg-muted">
          Enviamos um <span className="font-medium text-fg">código de 6 dígitos</span> pra{' '}
          <span className="font-medium text-fg">{email}</span>. Cole abaixo pra entrar:
        </p>

        <form onSubmit={handleVerify} className="space-y-3">
          <OtpInput
            ariaLabel={`Código de ${OTP_LENGTH} dígitos`}
            name="code"
            length={OTP_LENGTH}
            autoFocus
            error={Boolean(errorMsg)}
            value={code}
            onChange={setCode}
          />

          {errorMsg ? <Alert variant="error">{errorMsg}</Alert> : null}

          <Button type="submit" disabled={status === 'verifying'} className="w-full">
            {status === 'verifying' ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-[0.75rem] text-fg-subtle">
          Não chegou?{' '}
          <button
            type="button"
            onClick={() => {
              setStatus('idle')
              setCode('')
              setErrorMsg(null)
            }}
            className="text-fg-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Pedir outro
          </button>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleRequest} className="space-y-4">
      <Input
        type="email"
        required
        autoFocus
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {errorMsg ? <p className="text-[0.8125rem] text-danger">{errorMsg}</p> : null}
      <Button type="submit" disabled={status === 'sending'} className="w-full">
        {status === 'sending' ? 'Enviando...' : 'Receber código por email'}
      </Button>
    </form>
  )
}
