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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'student' },
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

          <p className="mt-4 text-center text-sm text-gray-500">
            Já tens conta?{' '}
            <Link href="/login" className="text-primary hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
