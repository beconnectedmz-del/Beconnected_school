'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Search, Star, Clock, BookOpen, TrendingUp, Users, Award,
  Flame, Crown, SlidersHorizontal, ChevronRight, Zap,
} from 'lucide-react'
import api from '@/lib/api'

interface Course {
  id: string | number[]
  title: string
  description: string
  price: number
  level: string
  discipline: string
  discipline_name?: string
  teacher_name: string
  teacher_rating: number
  total_enrollments: number
  duration_hours?: number
  thumbnail_url?: string
}

const LEVELS: Record<string, string> = {
  basic:        'Básico',
  intermediate: 'Intermédio',
  advanced:     'Avançado',
  beginner:     'Iniciante',
  all:          'Todos os níveis',
}

const DISCIPLINES = [
  { slug: 'matematica', label: 'Matemática', icon: '📐' },
  { slug: 'fisica',     label: 'Física',     icon: '⚡' },
  { slug: 'quimica',    label: 'Química',    icon: '🧪' },
  { slug: 'ingles',     label: 'Inglês',     icon: '🌍' },
  { slug: 'portugues',  label: 'Português',  icon: '📝' },
  { slug: 'programacao',label: 'Programação',icon: '💻' },
]

// Simulated scarcity / FOMO data keyed by position — decorative only
const COURSE_META = [
  { badge: '🔥 Popular',  scarcity: '8 vagas restantes',  weekly: 34, discount: 44 },
  { badge: '⚡ Mais vendido', scarcity: '12 vagas restantes', weekly: 28, discount: 40 },
  { badge: '✨ Novo',     scarcity: '4 vagas restantes',  weekly: 19, discount: 40 },
  { badge: '🏆 Top rated', scarcity: '6 vagas restantes', weekly: 22, discount: 33 },
  { badge: '🔥 Popular',  scarcity: '9 vagas restantes',  weekly: 17, discount: 40 },
  { badge: '⚡ Em alta',  scarcity: '15 vagas restantes', weekly: 25, discount: 38 },
]

function courseId(id: string | number[] | undefined | null): string {
  if (!id) return ''
  if (typeof id === 'string') return id
  if (!Array.isArray(id)) return String(id)
  const hex = Array.from(id).map(b => (b as number).toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

function StarRow({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-px">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}
          fill={s <= Math.round(rating) ? 'currentColor' : 'currentColor'}
        />
      ))}
    </div>
  )
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [search, setSearch]       = useState('')
  const [discipline, setDiscipline] = useState('')
  const [level, setLevel]         = useState('')
  const [sortBy, setSortBy]       = useState('popular')
  const [loading, setLoading]     = useState(true)
  const [viewingNow] = useState(47)

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (search)     params.set('q', search)
        if (discipline) params.set('discipline', discipline)
        if (level)      params.set('level', level)
        const qs = params.toString()
        const res = await api.get(qs ? `/courses?${qs}` : '/courses')
        const raw: Course[] = res.data.data || res.data || []
        // Sort client-side
        const sorted = [...raw].sort((a, b) => {
          if (sortBy === 'price-asc')  return a.price - b.price
          if (sortBy === 'price-desc') return b.price - a.price
          if (sortBy === 'rating')     return (b.teacher_rating || 0) - (a.teacher_rating || 0)
          return (b.total_enrollments || 0) - (a.total_enrollments || 0) // popular
        })
        setCourses(sorted)
      } catch {
        setCourses([])
      } finally {
        setLoading(false)
      }
    }
    const debounce = setTimeout(fetchCourses, 350)
    return () => clearTimeout(debounce)
  }, [search, discipline, level, sortBy])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-primary-dark to-secondary-dark px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-grid pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />

        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30">
                <Crown size={14} className="text-white" />
              </div>
              <span className="text-lg font-black leading-none">
                <span className="text-primary">Be</span><span className="text-white">connect</span>
                <span className="text-white/50 font-semibold text-xs"> School</span>
              </span>
            </Link>
            <Link href="/login" className="glass text-white/90 text-sm font-semibold px-4 py-1.5 rounded-xl hover:bg-white/20 transition-all">
              Entrar
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                Cursos disponíveis
              </h1>
              <div className="flex items-center gap-3 text-white/60 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  <strong className="text-white">{viewingNow}</strong> pessoas a ver agora
                </span>
                <span className="text-white/20">·</span>
                <span><strong className="text-white">{courses.length || '...'}</strong> cursos encontrados</span>
              </div>
            </div>
            {/* Sort */}
            <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 text-sm text-white/80 w-fit">
              <SlidersHorizontal size={14} />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-transparent text-white/80 text-sm focus:outline-none cursor-pointer"
              >
                <option value="popular"    className="text-gray-900">Mais populares</option>
                <option value="rating"     className="text-gray-900">Melhor avaliação</option>
                <option value="price-asc"  className="text-gray-900">Menor preço</option>
                <option value="price-desc" className="text-gray-900">Maior preço</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Discipline filter pills ───────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
          <button
            onClick={() => setDiscipline('')}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              !discipline ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
            }`}
          >
            Todos
          </button>
          {DISCIPLINES.map(d => (
            <button
              key={d.slug}
              onClick={() => setDiscipline(d.slug === discipline ? '' : d.slug)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                discipline === d.slug ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
              }`}
            >
              <span>{d.icon}</span>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ── Search + level filter ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-10 shadow-sm"
              placeholder="Pesquisar cursos, professores, temas…"
            />
          </div>
          <select
            value={level}
            onChange={e => setLevel(e.target.value)}
            className="input w-auto shadow-sm"
          >
            <option value="">Todos os níveis</option>
            {Object.entries(LEVELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* ── Results ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="h-44 shimmer-bg" />
                <div className="p-5 space-y-3">
                  <div className="h-3 shimmer-bg rounded-full w-1/3" />
                  <div className="h-4 shimmer-bg rounded-full w-3/4" />
                  <div className="h-3 shimmer-bg rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <BookOpen size={36} className="opacity-40" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-600 text-lg">Nenhum curso encontrado</p>
              <p className="text-sm mt-1">Tenta ajustar os filtros ou o termo de pesquisa.</p>
            </div>
            <button onClick={() => { setSearch(''); setDiscipline(''); setLevel('') }} className="btn-primary mt-2">
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {courses.map((c, idx) => {
              const meta  = COURSE_META[idx % COURSE_META.length]
              const simPrice = c.price || 0
              const origPrice = simPrice > 0 ? Math.round(simPrice / (1 - meta.discount / 100) / 100) * 100 : 0
              const id = courseId(c.id)
              const isLowStock = parseInt(meta.scarcity) <= 6

              return (
                <Link key={id} href={`/courses/${id}`}>
                  <div className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-card-lift hover:-translate-y-1.5 transition-all duration-300 h-full flex flex-col">

                    {/* Thumbnail */}
                    <div className="h-44 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/20 relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <BookOpen size={28} className="text-primary" />
                      </div>

                      {/* Badge */}
                      <div className={`absolute top-3 left-3 badge ${
                        meta.badge.includes('🔥') ? 'badge-orange' :
                        meta.badge.includes('⚡') ? 'badge-blue' :
                        meta.badge.includes('🏆') ? 'badge-purple' : 'badge-green'
                      }`}>
                        {meta.badge}
                      </div>

                      {/* Scarcity */}
                      <div className={`absolute bottom-3 right-3 flex items-center gap-1.5 text-white text-xs font-bold px-2.5 py-1 rounded-full ${isLowStock ? 'bg-red-600' : 'bg-gray-700'}`}>
                        <Clock size={10} />
                        {meta.scarcity}
                      </div>

                      {/* Verified teacher */}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-primary text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <Award size={9} /> Verificado
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        {c.discipline_name || c.discipline} · {LEVELS[c.level] || c.level}
                      </div>
                      <h3 className="font-bold text-gray-900 text-base leading-snug mb-1.5 group-hover:text-primary transition-colors line-clamp-2 flex-1">
                        {c.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
                        <Crown size={13} className="text-gray-400" />
                        {c.teacher_name}
                      </p>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-black text-amber-500 text-sm">{(c.teacher_rating || 0).toFixed(1)}</span>
                        <StarRow rating={c.teacher_rating || 0} />
                        <span className="text-xs text-gray-400 ml-1">
                          · <Users size={10} className="inline" /> {(c.total_enrollments || 0).toLocaleString()}
                        </span>
                        {c.duration_hours && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                              <Clock size={10} /> {c.duration_hours}h
                            </span>
                          </>
                        )}
                      </div>

                      {/* FOMO */}
                      <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5 mb-4">
                        <TrendingUp size={11} className="text-emerald-600" />
                        <span className="text-xs text-emerald-700 font-semibold">
                          {meta.weekly} inscrições esta semana
                        </span>
                      </div>

                      {/* Price */}
                      <div className="flex items-end justify-between mt-auto">
                        <div>
                          <span className="text-xl font-black text-gray-900">
                            {simPrice === 0 ? 'Grátis' : `${simPrice.toLocaleString()} MZN`}
                          </span>
                          {simPrice > 0 && origPrice > 0 && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-gray-400 line-through">{origPrice.toLocaleString()} MZN</span>
                              <span className="badge badge-red text-[10px]">-{meta.discount}%</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-primary text-sm font-bold group-hover:gap-2 transition-all">
                          Ver curso <ChevronRight size={15} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* ── Trust strip ──────────────────────────────────────────── */}
        {!loading && courses.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-primary-50 to-purple-50 border border-primary/10 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap gap-5 text-sm text-gray-600">
              {[
                [Zap,   '1ª aula grátis em qualquer curso'],
                [Award, 'Professores verificados e certificados'],
                [TrendingUp, 'Garantia de 7 dias'],
              ].map(([Icon, text], i) => (
                <div key={i} className="flex items-center gap-1.5 font-medium">
                  <Icon size={15} className="text-primary" />
                  {text as string}
                </div>
              ))}
            </div>
            <Link href="/register" className="btn-primary shrink-0 text-sm py-2 px-5">
              Começar grátis
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
