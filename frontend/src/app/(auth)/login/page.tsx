'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Crown } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  totp_code: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [needs2FA, setNeeds2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      if (needs2FA) {
        const res = await api.post('/auth/2fa/login', {
          temp_token: tempToken,
          totp_code: data.totp_code,
        })
        setAuth(res.data.user, res.data.access_token)
        router.push(res.data.user.role === 'teacher' ? '/teacher' : '/dashboard')
        return
      }

      const res = await api.post('/auth/login', { email: data.email, password: data.password })

      if (res.data.requires_2fa) {
        setTempToken(res.data.temp_token)
        setNeeds2FA(true)
        return
      }

      setAuth(res.data.user, res.data.access_token)
      router.push(res.data.user.role === 'teacher' ? '/teacher' : '/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error || 'Credenciais incorrectas'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center mb-2">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30">
              <Crown size={18} className="text-white" />
            </div>
            <span className="text-2xl font-black">
              <span className="text-primary">Be</span><span className="text-secondary">connect</span>
              <span className="text-secondary/60 font-semibold text-lg"> School</span>
            </span>
          </Link>
          <p className="text-gray-500 mt-1">Inicia sessão na tua conta</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!needs2FA ? (
              <>
                <div>
                  <label className="label">Email</label>
                  <input {...register('email')} type="email" className="input" placeholder="tu@exemplo.com" />
                  {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="label">Palavra-passe</label>
                  <input {...register('password')} type="password" className="input" placeholder="••••••••" />
                  {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Autenticação de dois factores activa. Introduz o código da tua app autenticadora.
                </p>
                <label className="label">Código TOTP</label>
                <input
                  {...register('totp_code')}
                  type="text"
                  className="input text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>
            )}

            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-2 text-danger text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
              {isSubmitting ? 'A entrar…' : needs2FA ? 'Verificar código' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Esqueci a palavra-passe
            </Link>
            <span className="mx-2">·</span>
            <Link href="/register" className="text-primary hover:underline">
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
