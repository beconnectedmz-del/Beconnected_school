'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Star, Clock, Users, BookOpen, Crown, Play, Lock, Shield, Award,
  CheckCircle, Check, Zap, TrendingUp, ChevronDown, ChevronUp, Globe, BarChart3,
  Video, ArrowRight,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'

interface CourseDetail {
  id: string
  title: string
  description: string
  level: string
  price: number
  lesson_type: string
  total_hours: number
  total_lessons: number
  enrolled_count: number
  thumbnail_url: string
  promo_video_url: string
  teacher_name: string
  teacher_id: string
  discipline_name: string
  avg_rating: number
  review_count: number
  is_published: boolean
  is_featured: boolean
}

interface Lesson {
  id: string
  title: string
  lesson_order: number
  duration_minutes: number
  is_free_preview: boolean
  status: string
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Iniciante', intermediate: 'Intermédio', advanced: 'Avançado',
  basic: 'Básico', all: 'Todos os níveis',
}
const TYPE_LABELS: Record<string, string> = {
  live: 'Aulas ao vivo', recorded: 'Pré-gravado', hybrid: 'Híbrido',
}

function pad2(n: number) { return String(n).padStart(2, '0') }

function EnrollCard({
  course, originalPrice, discountPct, timeLeft, enrolled, enrolling, onEnroll, lessons,
}: {
  course: CourseDetail; originalPrice: number; discountPct: number
  timeLeft: { h: number; m: number; s: number }
  enrolled: boolean; enrolling: boolean; onEnroll: () => void; lessons: Lesson[]
}) {
  const freeCount = lessons.filter(l => l.is_free_preview).length
  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-black/15 overflow-hidden border border-gray-100 sticky top-20">
      {/* Countdown */}
      <div className="bg-gradient-to-r from-secondary to-primary px-5 py-3">
        <p className="text-white/80 text-xs font-bold uppercase tracking-wide mb-2">⏰ Oferta expira em</p>
        <div className="flex gap-2">
          {[{ v: timeLeft.h, l: 'h' }, { v: timeLeft.m, l: 'min' }, { v: timeLeft.s, l: 'seg' }].map(({ v, l }) => (
            <div key={l} className="bg-white/20 rounded-lg px-3 py-1.5 text-center min-w-[2.5rem]">
              <div className="text-white font-black text-xl leading-none">{pad2(v)}</div>
              <div className="text-white/60 text-[9px] uppercase mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* Price anchoring */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-900">{course.price.toLocaleString()}</span>
            <span className="text-gray-400 font-semibold">MZN</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="line-through text-gray-400 text-sm">{originalPrice.toLocaleString()} MZN</span>
            <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">
              {discountPct}% DESCONTO
            </span>
          </div>
        </div>

        {/* Scarcity */}
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <p className="text-red-700 text-xs font-bold">Apenas 8 vagas restantes a este preço!</p>
        </div>

        {/* CTA */}
        <button
          onClick={onEnroll}
          disabled={enrolling || enrolled}
          className={`w-full py-4 rounded-xl font-black text-white text-lg mb-3 transition-all ${
            enrolled
              ? 'bg-success cursor-default'
              : 'bg-gradient-to-r from-primary to-primary-dark hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-primary/30'
          }`}
        >
          {enrolling ? 'A inscrever…' : enrolled ? '✓ Inscrito com sucesso' : '🚀 Inscrever agora'}
        </button>
        <p className="text-center text-xs text-gray-400 mb-5">
          Garantia de devolução em 30 dias · Sem risco
        </p>

        {/* Includes */}
        <div className="space-y-2.5 border-t border-gray-100 pt-4">
          <p className="font-bold text-gray-700 text-sm">Este curso inclui:</p>
          {[
            { icon: Clock,     text: `${course.total_hours}h de conteúdo` },
            { icon: BookOpen,  text: `${course.total_lessons} aulas` },
            { icon: Globe,     text: 'Acesso vitalício' },
            { icon: Award,     text: 'Certificado de conclusão' },
            ...(freeCount > 0 ? [{ icon: Play, text: `${freeCount} aula(s) gratuita(s)` }] : []),
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-sm text-gray-600">
              <Icon size={14} className="text-primary shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getLearnPoints(discipline: string): string[] {
  return [
    `Dominar os conceitos fundamentais de ${discipline}`,
    'Aplicar o conhecimento em situações práticas reais',
    'Desenvolver raciocínio crítico e analítico',
    'Resolver exercícios e problemas com confiança',
    'Preparar-se para exames e avaliações nacionais',
    'Aceder a recursos exclusivos e suporte do professor',
  ]
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user } = useAuthStore()
  const [course, setCourse]     = useState<CourseDetail | null>(null)
  const [lessons, setLessons]   = useState<Lesson[]>([])
  const [loading, setLoading]   = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [enrolled, setEnrolled] = useState(false)
  const [errMsg, setErrMsg]     = useState('')
  const [openLesson, setOpenLesson] = useState<number | null>(null)
  const [timeLeft,         setTimeLeft]         = useState({ h: 23, m: 47, s: 12 })
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [selectedPackage,  setSelectedPackage]  = useState<'basic' | 'lite' | 'premium'>('lite')

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 }
        if (prev.m > 0) return { ...prev, m: prev.m - 1, s: 59 }
        if (prev.h > 0) return { h: prev.h - 1, m: 59, s: 59 }
        return prev
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [courseRes, lessonsRes] = await Promise.all([
          api.get(`/courses/${params.id}`),
          api.get(`/courses/${params.id}/lessons`).catch(() => ({ data: [] })),
        ])
        setCourse(courseRes.data)
        setLessons(Array.isArray(lessonsRes.data) ? lessonsRes.data : [])
      } catch {
        setErrMsg('Curso não encontrado')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  const handleEnroll = () => {
    if (!user) {
      router.push(`/login?redirect=/courses/${params.id}`)
      return
    }
    setShowPackageModal(true)
  }

  const confirmEnroll = async () => {
    setEnrolling(true)
    setErrMsg('')
    try {
      await api.post(`/courses/${params.id}/enroll`, { package_type: selectedPackage })
      setEnrolled(true)
      setShowPackageModal(false)
      setTimeout(() => router.push('/dashboard'), 1200)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || ''
      if (msg.includes('já está matriculado')) {
        setEnrolled(true)
        setShowPackageModal(false)
        setTimeout(() => router.push('/dashboard'), 1200)
      } else {
        setErrMsg(msg || 'Erro ao inscrever. Tenta novamente.')
        setShowPackageModal(false)
      }
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">A carregar curso…</p>
        </div>
      </div>
    )
  }

  if (errMsg || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={36} className="text-gray-300" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Curso não encontrado</h1>
          <p className="text-gray-500 text-sm mb-6">Este curso não existe ou foi removido.</p>
          <Link href="/courses" className="btn-primary inline-flex gap-2">
            <ArrowRight size={16} /> Ver todos os cursos
          </Link>
        </div>
      </div>
    )
  }

  const discountPct   = 40
  const originalPrice = Math.round(course.price / (1 - discountPct / 100))
  const avgRating     = Number(course.avg_rating) || 0
  const reviewCount   = Number(course.review_count) || 0

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30">
              <Crown size={13} className="text-white" />
            </div>
            <span className="text-base font-black">
              <span className="text-primary">Be</span><span className="text-secondary">connect</span>
              <span className="text-secondary/50 text-xs font-semibold"> School</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href={user.role === 'teacher' ? '/teacher' : '/dashboard'}
                className="btn-outline py-1.5 px-4 text-sm"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Entrar</Link>
                <Link href="/register" className="btn-primary py-1.5 px-4 text-sm">Começar grátis</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-primary transition-colors">Início</Link>
          <span>/</span>
          <Link href="/courses" className="hover:text-primary transition-colors">Cursos</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium truncate max-w-xs">{course.title}</span>
        </div>
      </div>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#061924] via-[#0D2B3A] to-[#1B3268] text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-10">

            {/* Left: course info */}
            <div className="lg:col-span-2">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-5">
                {course.is_featured && (
                  <span className="bg-primary/20 border border-primary/40 text-primary-light text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap size={10} /> Destaque
                  </span>
                )}
                <span className="bg-white/10 border border-white/20 text-white/80 text-xs font-semibold px-3 py-1 rounded-full">
                  {course.discipline_name}
                </span>
                <span className="bg-white/10 border border-white/20 text-white/80 text-xs font-semibold px-3 py-1 rounded-full">
                  {LEVEL_LABELS[course.level] || course.level}
                </span>
                <span className="bg-white/10 border border-white/20 text-white/80 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  {course.lesson_type === 'live' ? <Video size={10} /> : <Play size={10} />}
                  {TYPE_LABELS[course.lesson_type] || course.lesson_type}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-black leading-tight mb-4">{course.title}</h1>

              {course.description && (
                <p className="text-white/70 text-base leading-relaxed mb-6 max-w-2xl">
                  {course.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-5 mb-8">
                {avgRating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-amber-400">{avgRating.toFixed(1)}</span>
                    <div className="flex gap-px">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={13}
                          fill={s <= Math.round(avgRating) ? 'currentColor' : 'none'}
                          className={s <= Math.round(avgRating) ? 'text-amber-400' : 'text-white/30'}
                        />
                      ))}
                    </div>
                    <span className="text-white/50 text-sm">({reviewCount.toLocaleString()} avaliações)</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-white/70 text-sm">
                  <Users size={14} />
                  <span><strong className="text-white">{course.enrolled_count.toLocaleString()}</strong> inscritos</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/70 text-sm">
                  <Clock size={14} />
                  <span>{course.total_hours}h de conteúdo</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/70 text-sm">
                  <BookOpen size={14} />
                  <span>{course.total_lessons} aulas</span>
                </div>
              </div>

              {/* Teacher */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-black shadow-lg shrink-0">
                  {course.teacher_name?.charAt(0) || 'P'}
                </div>
                <div>
                  <p className="text-white/50 text-xs mb-0.5">Criado por</p>
                  <p className="font-bold text-white">{course.teacher_name}</p>
                </div>
                <span className="ml-1 inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs px-2 py-0.5 rounded-full">
                  <CheckCircle size={10} /> Verificado
                </span>
              </div>
            </div>

            {/* Right: enroll card (desktop only in hero) */}
            <div className="hidden lg:block">
              <EnrollCard
                course={course}
                originalPrice={originalPrice}
                discountPct={discountPct}
                timeLeft={timeLeft}
                enrolled={enrolled}
                enrolling={enrolling}
                onEnroll={handleEnroll}
                lessons={lessons}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-10">

          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Mobile: enroll card */}
            <div className="lg:hidden">
              <EnrollCard
                course={course}
                originalPrice={originalPrice}
                discountPct={discountPct}
                timeLeft={timeLeft}
                enrolled={enrolled}
                enrolling={enrolling}
                onEnroll={handleEnroll}
                lessons={lessons}
              />
            </div>

            {errMsg && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm">
                {errMsg}
              </div>
            )}

            {/* What you'll learn */}
            <div className="card">
              <h2 className="text-xl font-black text-gray-900 mb-5 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" />
                O que vais aprender
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {getLearnPoints(course.discipline_name).map((pt, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle size={16} className="text-success shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm leading-snug">{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Curriculum */}
            <div className="card">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <BookOpen size={20} className="text-primary" />
                  Conteúdo do curso
                </h2>
                <span className="text-sm text-gray-400">
                  {lessons.length} aulas · {course.total_hours}h
                </span>
              </div>

              {lessons.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Aulas serão publicadas em breve</p>
                  <p className="text-xs mt-1 text-gray-300">Inscreve-te agora para ser notificado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lessons.map((lesson, idx) => (
                    <div key={lesson.id} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenLesson(openLesson === idx ? null : idx)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          lesson.is_free_preview
                            ? 'bg-primary/10 text-primary'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {lesson.is_free_preview
                            ? <Play size={13} fill="currentColor" />
                            : <Lock size={13} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                            {lesson.lesson_order}. {lesson.title}
                          </p>
                          {lesson.is_free_preview && (
                            <span className="text-xs text-primary font-semibold">Pré-visualização gratuita</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {lesson.duration_minutes > 0 && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={11} /> {lesson.duration_minutes}min
                            </span>
                          )}
                          {openLesson === idx
                            ? <ChevronUp size={14} className="text-gray-400" />
                            : <ChevronDown size={14} className="text-gray-400" />}
                        </div>
                      </button>
                      {openLesson === idx && (
                        <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
                          {lesson.is_free_preview ? (
                            <button className="btn-primary text-sm py-2 px-4 gap-2 inline-flex items-center">
                              <Play size={13} fill="currentColor" /> Assistir pré-visualização
                            </button>
                          ) : (
                            <p className="text-sm text-gray-500">
                              🔒 Esta aula fica disponível após inscrição.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teacher card */}
            <div className="card">
              <h2 className="text-xl font-black text-gray-900 mb-5 flex items-center gap-2">
                <Award size={20} className="text-secondary" />
                Sobre o professor
              </h2>
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-black text-2xl shadow-lg shrink-0">
                  {course.teacher_name?.charAt(0) || 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-black text-gray-900">{course.teacher_name}</h3>
                    <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle size={9} /> Verificado
                    </span>
                  </div>
                  <p className="text-primary font-semibold text-sm mb-3">
                    Professor de {course.discipline_name}
                  </p>
                  <div className="flex flex-wrap gap-5 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1"><Star size={11} className="text-amber-400" fill="currentColor" /> Avaliação 4.8</span>
                    <span className="flex items-center gap-1"><Users size={11} /> {Math.max(course.enrolled_count, 120)} alunos</span>
                    <span className="flex items-center gap-1"><BookOpen size={11} /> Especialista em {course.discipline_name}</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Professor com vasta experiência em {course.discipline_name}, dedicado a tornar
                    o aprendizado acessível e eficaz. Utiliza metodologias comprovadas para
                    garantir o sucesso académico dos seus alunos.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Shield,   label: 'Garantia 30 dias', desc: 'Devolução total'       },
                { icon: Award,    label: 'Certificado',      desc: 'Reconhecido'            },
                { icon: Globe,    label: 'Acesso vitalício', desc: 'Aprende ao teu ritmo'   },
                { icon: BarChart3,label: 'Suporte directo',  desc: 'Do professor'           },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="card text-center py-5 hover:shadow-card-lift transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <p className="font-bold text-gray-900 text-xs">{label}</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">{desc}</p>
                </div>
              ))}
            </div>

            {/* Social proof bar */}
            <div className="bg-gradient-to-r from-secondary/5 to-primary/5 border border-primary/15 rounded-2xl p-5">
              <div className="flex flex-wrap gap-6 items-center justify-around text-center">
                {[
                  { value: `${course.enrolled_count.toLocaleString()}+`, label: 'alunos inscritos' },
                  { value: avgRating > 0 ? avgRating.toFixed(1) : '4.8', label: 'avaliação média' },
                  { value: `${course.total_hours}h`,  label: 'de conteúdo'   },
                  { value: course.total_lessons > 0 ? `${course.total_lessons}` : '?', label: 'aulas' },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <p className="text-2xl font-black text-secondary">{value}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop sidebar space — card already rendered in hero */}
          <div className="hidden lg:block" />
        </div>
      </div>

      {/* ── Mobile sticky footer ────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-2xl z-50">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-black text-xl text-gray-900 leading-none">
              {course.price.toLocaleString()}
              <span className="text-xs text-gray-400 font-normal ml-1">MZN</span>
            </p>
            <p className="text-xs text-gray-400 line-through leading-none mt-0.5">
              {originalPrice.toLocaleString()} MZN
            </p>
          </div>
          <button
            onClick={handleEnroll}
            disabled={enrolling || enrolled}
            className="btn-primary flex-1 py-3 text-base font-black"
          >
            {enrolling ? 'A inscrever…' : enrolled ? '✓ Inscrito' : 'Inscrever agora'}
          </button>
        </div>
      </div>
      <div className="lg:hidden h-20" />

      {/* ── Package selection modal ─────────────────────────────────── */}
      {showPackageModal && course && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900">Escolha o seu pacote</h2>
              <p className="text-gray-500 text-sm mt-0.5">{course.title}</p>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([
                {
                  type: 'basic' as const, label: 'Básico', price: 500,
                  badge: 'bg-gray-100 text-gray-700',
                  features: ['Aulas gravadas', 'Acesso 24/7', 'Certificado de conclusão', 'Suporte via chat'],
                },
                {
                  type: 'lite' as const, label: 'Lite', price: 1500,
                  badge: 'bg-primary/10 text-primary',
                  popular: true,
                  features: ['Tudo do Básico', 'Sessões ao vivo em grupo', 'Q&A ao vivo com o professor', 'Horários fixos mensais'],
                },
                {
                  type: 'premium' as const, label: 'Premium', price: 3500,
                  badge: 'bg-secondary/10 text-secondary',
                  features: ['Tudo do Lite', 'Aulas 1:1 personalizadas', 'Horário totalmente flexível', 'Plano de estudo individual'],
                },
              ] as const).map(pkg => (
                <button
                  key={pkg.type}
                  onClick={() => setSelectedPackage(pkg.type)}
                  className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                    selectedPackage === pkg.type
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {'popular' in pkg && pkg.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-black px-2.5 py-0.5 bg-primary text-white rounded-full whitespace-nowrap">
                      Recomendado
                    </span>
                  )}
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black ${pkg.badge} mb-3`}>
                    {pkg.label}
                  </span>
                  <div className="mb-3">
                    <span className="text-2xl font-black text-gray-900">{pkg.price.toLocaleString()}</span>
                    <span className="text-gray-400 text-xs ml-1">MZN/mês</span>
                  </div>
                  <ul className="space-y-1.5">
                    {pkg.features.map(f => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <CheckCircle size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {selectedPackage === pkg.type && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check size={11} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Pacote seleccionado:{' '}
                  <strong className="text-gray-900">
                    {selectedPackage === 'basic' ? 'Básico (500 MZN/mês)' :
                     selectedPackage === 'lite'  ? 'Lite (1.500 MZN/mês)' :
                                                   'Premium (3.500 MZN/mês)'}
                  </strong>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Garantia 30 dias · Cancela quando quiser</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => setShowPackageModal(false)} className="btn-outline py-2 px-4 text-sm">
                  Cancelar
                </button>
                <button onClick={confirmEnroll} disabled={enrolling}
                  className="btn-primary py-2 px-5 text-sm font-black gap-2">
                  {enrolling ? 'A inscrever…' : 'Confirmar inscrição →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
