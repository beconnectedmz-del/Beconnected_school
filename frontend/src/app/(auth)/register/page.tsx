'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Crown } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { Role } from '@/store/auth'

const schema = z.object({
  full_name:        z.string().min(2, 'Mínimo 2 caracteres'),
  email:            z.string().email('Email inválido'),
  password:         z.string().min(8, 'Mínimo 8 caracteres'),
  password_confirm: z.string(),
  role:             z.enum(['student', 'teacher']),
}).refine((d) => d.password === d.password_confirm, {
  message: 'As palavras-passe não coincidem',
  path: ['password_confirm'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [googleRole, setGoogleRole] = useState<'student' | 'teacher'>('student')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'student' },
  })

  const googleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await api.post('/auth/google', { id_token: tokenResponse.access_token, role: googleRole })
        setAuth(res.data.user, res.data.access_token)
        router.push(googleRole === 'teacher' ? '/teacher' : '/dashboard')
      } catch {
        setError('Erro ao registar com Google. Tenta novamente.')
      }
    },
    onError: () => setError('Registo com Google cancelado ou falhou.'),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await api.post('/auth/register', {
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        role: data.role,
      })
      setAuth(res.data.user, res.data.access_token)
      router.push(data.role === 'teacher' ? '/teacher' : '/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error || 'Erro ao registar. Tenta novamente.'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 py-12">
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
          <p className="text-gray-500 mt-1">Cria a tua conta gratuita</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="label">Sou</label>
              <div className="grid grid-cols-2 gap-3">
                {(['student', 'teacher'] as Role[]).map((r) => (
                  <label
                    key={r}
                    className="relative flex items-center justify-center gap-2 border-2 rounded-xl p-3
                               cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5
                               border-gray-200 text-sm font-medium"
                  >
                    <input {...register('role')} type="radio" value={r} className="sr-only" />
                    {r === 'student' ? '🎓 Estudante' : '👨‍🏫 Professor'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Nome completo</label>
              <input {...register('full_name')} className="input" placeholder="João Silva" />
              {errors.full_name && <p className="text-danger text-xs mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="tu@exemplo.com" />
              {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Palavra-passe</label>
              <input {...register('password')} type="password" className="input" placeholder="Mínimo 8 caracteres" />
              {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirmar palavra-passe</label>
              <input {...register('password_confirm')} type="password" className="input" placeholder="Repetir palavra-passe" />
              {errors.password_confirm && <p className="text-danger text-xs mt-1">{errors.password_confirm.message}</p>}
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-2 text-danger text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
              {isSubmitting ? 'A registar…' : 'Criar conta'}
            </button>
          </form>

          <div className="mt-5">
            <div className="relative flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">ou regista com</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {/* Role selector for Google */}
            <div className="flex gap-2 mb-3">
              {(['student', 'teacher'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setGoogleRole(r)}
                  className={`flex-1 text-xs font-semibold py-2 rounded-xl border-2 transition-colors ${googleRole === r ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}
                >
                  {r === 'student' ? '🎓 Estudante' : '👨‍🏫 Professor'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => googleRegister()}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Registar com Google como {googleRole === 'student' ? 'Estudante' : 'Professor'}
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-gray-500">
            Já tens conta?{' '}
            <Link href="/login" className="text-primary hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
