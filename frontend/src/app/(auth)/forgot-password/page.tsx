'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { Mail, ArrowLeft, Crown } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email inválido'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await api.post('/auth/forgot-password', { email: data.email })
      setSent(true)
    } catch {
      // Always show success to avoid email enumeration
      setSent(true)
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
          <p className="text-gray-500 mt-1">Recuperar palavra-passe</p>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={32} className="text-success" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Email enviado!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Se existir uma conta com esse email, receberás um link para redefinir a tua palavra-passe.
              </p>
              <Link href="/login" className="btn-primary inline-flex items-center gap-2">
                <ArrowLeft size={16} />
                Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <p className="text-gray-600 text-sm">
                Introduz o teu email e enviaremos um link para redefinires a tua palavra-passe.
              </p>

              <div>
                <label className="label">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  className="input"
                  placeholder="tu@exemplo.com"
                  autoFocus
                />
                {errors.email && (
                  <p className="text-danger text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-2 text-danger text-sm">
                  {error}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
                {isSubmitting ? 'A enviar…' : 'Enviar link de recuperação'}
              </button>

              <div className="text-center text-sm text-gray-500">
                <Link href="/login" className="text-primary hover:underline inline-flex items-center gap-1">
                  <ArrowLeft size={13} />
                  Voltar ao login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
