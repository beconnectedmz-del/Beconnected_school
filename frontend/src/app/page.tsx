'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Star, ChevronRight, Shield, CheckCircle, ArrowRight,
  Flame, Sparkles, Crown, BarChart3,
  Heart, Lock, RefreshCcw, Play, Award, TrendingUp, Clock,
  Users, BookOpen, Video, Globe, Zap,
} from 'lucide-react'

/* ─── Logo Component ────────────────────────────────────────────────── */
function BcLogo({ dark = false, size = 'md' }: { dark?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const iconSize = size === 'sm' ? 13 : size === 'lg' ? 20 : 16
  const iconBox  = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'
  return (
    <div className="flex items-center gap-2">
      <div className={`${iconBox} rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30 flex-shrink-0`}>
        <Crown size={iconSize} className="text-white" />
      </div>
      <span className={`${textSize} font-black leading-none`}>
        <span className="text-primary">Be</span>
        <span className={dark ? 'text-white' : 'text-secondary'}>connect</span>
        <span className={`font-semibold text-[0.65em] ml-0.5 ${dark ? 'text-white/60' : 'text-secondary/60'}`}> School</span>
      </span>
    </div>
  )
}

/* ─── Data ──────────────────────────────────────────────────────────── */
const testimonials = [
  {
    name: 'Beatriz Cossa', city: 'Maputo', role: 'Estudante 12ª classe',
    initials: 'BC', gradient: 'from-orange-500 to-red-600', rating: 5,
    result: 'Aprovada no exame nacional!',
    text: 'Reprovei 2 vezes em Matemática. Depois de 3 meses com a Prof. Ana na Beconnect School, passei com 17 valores. Mudou literalmente a minha vida.',
  },
  {
    name: 'Hélder Mutemba', city: 'Beira', role: 'Estudante universitário',
    initials: 'HM', gradient: 'from-secondary to-secondary-light', rating: 5,
    result: '+3 valores na média final',
    text: 'A IA de match encontrou o professor perfeito para o meu nível em Física. As aulas ao vivo permitem tirar dúvidas em tempo real — incrível.',
  },
  {
    name: 'Felícia Mondlane', city: 'Nampula', role: 'Estudante de Inglês',
    initials: 'FM', gradient: 'from-emerald-500 to-teal-600', rating: 5,
    result: 'Conseguiu emprego internacional!',
    text: 'Nunca pensei aprender inglês fluente vivendo em Nampula. A Beconnect School tornou possível com professores certificados online.',
  },
]

const disciplines = [
  { name: 'Matemática',  icon: '📐', bg: 'from-orange-50 to-amber-50',    border: 'border-orange-200', text: 'text-orange-700',  count: '48 cursos' },
  { name: 'Física',      icon: '⚡', bg: 'from-blue-50 to-indigo-50',     border: 'border-blue-200',   text: 'text-blue-700',   count: '24 cursos' },
  { name: 'Química',     icon: '🧪', bg: 'from-green-50 to-emerald-50',   border: 'border-green-200',  text: 'text-green-700',  count: '18 cursos' },
  { name: 'Biologia',    icon: '🌿', bg: 'from-emerald-50 to-teal-50',    border: 'border-emerald-200',text: 'text-emerald-700',count: '22 cursos' },
  { name: 'Inglês',      icon: '🌍', bg: 'from-indigo-50 to-violet-50',   border: 'border-indigo-200', text: 'text-indigo-700', count: '35 cursos' },
  { name: 'Português',   icon: '📝', bg: 'from-orange-50 to-red-50',      border: 'border-orange-200', text: 'text-orange-700', count: '20 cursos' },
  { name: 'Programação', icon: '💻', bg: 'from-gray-50 to-slate-100',     border: 'border-slate-200',  text: 'text-slate-700',  count: '42 cursos' },
  { name: 'Economia',    icon: '📊', bg: 'from-secondary/5 to-blue-50',   border: 'border-secondary/20',text:'text-secondary',  count: '16 cursos' },
  { name: 'História',    icon: '📚', bg: 'from-amber-50 to-yellow-50',    border: 'border-amber-200',  text: 'text-amber-700',  count: '15 cursos' },
  { name: 'Geografia',   icon: '🗺️', bg: 'from-teal-50 to-cyan-50',      border: 'border-teal-200',   text: 'text-teal-700',   count: '12 cursos' },
  { name: 'Filosofia',   icon: '🧠', bg: 'from-violet-50 to-purple-50',   border: 'border-violet-200', text: 'text-violet-700', count: '8 cursos'  },
  { name: 'Música',      icon: '🎵', bg: 'from-pink-50 to-rose-50',       border: 'border-pink-200',   text: 'text-pink-700',   count: '10 cursos' },
]

const activityFeed = [
  { name: 'Maria C.', city: 'Maputo',    action: 'inscreveu-se em',      course: 'Matemática 12ª',        time: '2min'  },
  { name: 'João M.',  city: 'Beira',     action: 'completou',             course: 'Python do Zero',        time: '5min'  },
  { name: 'Ana S.',   city: 'Nampula',   action: 'avaliou com ⭐⭐⭐⭐⭐', course: 'Inglês Conversacional', time: '8min'  },
  { name: 'Pedro F.', city: 'Tete',      action: 'inscreveu-se em',      course: 'Física Avançada',       time: '12min' },
  { name: 'Carla B.', city: 'Quelimane', action: 'completou aula em',    course: 'Química',               time: '15min' },
  { name: 'Miguel A.',city: 'Maputo',    action: 'inscreveu-se em',      course: 'Programação Web',       time: '19min' },
]

const featuredCourses = [
  {
    title: 'Matemática para o 12° Ano — Exame Nacional',
    teacher: 'Prof. Ana Machava', discipline: 'Matemática', level: 'Intermédio',
    rating: 4.9, reviews: 847, students: 2341, hours: 40,
    price: 2500, originalPrice: 4500,
    badge: { label: '🔥 Mais popular', cls: 'badge-orange' },
    scarcity: '6 vagas restantes', weeklyEnroll: 34,
  },
  {
    title: 'Python do Zero ao Avançado — Mercado de Trabalho',
    teacher: 'Prof. Carlos Nhangumbe', discipline: 'Programação', level: 'Todos os níveis',
    rating: 4.8, reviews: 612, students: 1893, hours: 60,
    price: 3000, originalPrice: 5000,
    badge: { label: '⚡ Mais vendido', cls: 'badge-blue' },
    scarcity: '12 vagas restantes', weeklyEnroll: 28,
  },
  {
    title: 'Inglês Conversacional — Do Básico ao Fluente',
    teacher: 'Prof. Fátima Matavel', discipline: 'Inglês', level: 'Iniciante',
    rating: 5.0, reviews: 423, students: 1204, hours: 30,
    price: 1800, originalPrice: 3000,
    badge: { label: '✨ Novo', cls: 'badge-green' },
    scarcity: '4 vagas restantes', weeklyEnroll: 19,
  },
]

/* ─── Sub-components ────────────────────────────────────────────────── */
function StarRow({ n = 5, size = 12 }: { n?: number; size?: number }) {
  return (
    <div className="flex">
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} size={size} className="text-amber-400" fill="currentColor" />
      ))}
    </div>
  )
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const dur = 1800
    const raf = () => {
      const t = Math.min((Date.now() - start) / dur, 1)
      setVal(Math.floor((1 - Math.pow(1 - t, 3)) * target))
      if (t < 1) requestAnimationFrame(raf)
    }
    const id = setTimeout(() => requestAnimationFrame(raf), 300)
    return () => clearTimeout(id)
  }, [target])
  return <>{val.toLocaleString()}{suffix}</>
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [online] = useState(143)
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState({ h: 23, m: 47, s: 33 })

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => {
      setTime(prev => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 }
        if (prev.m > 0) return { ...prev, m: prev.m - 1, s: 59 }
        if (prev.h > 0) return { h: prev.h - 1, m: 59, s: 59 }
        return prev
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Announcement bar ─────────────────────────────────────────── */}
      <div className="bg-primary text-white text-center py-2.5 text-sm font-semibold">
        👑 <strong>Beconnect School</strong> — 40% de desconto em todos os cursos de lançamento &nbsp;
        <Link href="/courses" className="underline underline-offset-2 hover:opacity-80 font-bold">
          Ver cursos →
        </Link>
      </div>

      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-2xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/"><BcLogo /></Link>
            <div className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-500">
              <Link href="#como-funciona" className="hover:text-primary transition-colors">Como funciona</Link>
              <Link href="/courses"       className="hover:text-primary transition-colors">Cursos</Link>
              <Link href="#disciplinas"   className="hover:text-primary transition-colors">Disciplinas</Link>
              <Link href="#depoimentos"   className="hover:text-primary transition-colors">Depoimentos</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              {online} online
            </div>
            <Link href="/login"    className="text-sm font-semibold text-gray-600 hover:text-primary transition-colors px-3 py-1.5">Entrar</Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-5 rounded-xl">Começar grátis</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: '620px' }}>

        {/* Hero background image */}
        <img
          src="/hero-banner.jpg"
          alt="Beconnect School"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ objectPosition: 'center top' }}
        />

        {/* Left gradient overlay so text is readable */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(100deg, rgba(6,25,36,0.95) 0%, rgba(13,43,58,0.85) 40%, rgba(13,43,58,0.30) 65%, transparent 100%)' }}
        />

        {/* Bottom fade for smooth transition to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to bottom, transparent, #f9fafb)' }} />

        {/* Content — left aligned to match image composition */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-20 md:py-28">
          <div className="max-w-xl">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white/90 text-xs font-bold px-4 py-2 rounded-full mb-7 shadow-lg animate-fade-in">
              <Sparkles size={13} className="text-primary" />
              Escola Virtual do Grupo Beconnect · Moçambique
              <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-black ml-1">NOVO</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.04] tracking-tight mb-5 animate-fade-up">
              Aprende com os<br />
              <span style={{ background: 'linear-gradient(90deg, #F47920, #F69040, #FFB347)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                melhores professores
              </span><br />
              de Moçambique
            </h1>

            <p className="text-base md:text-lg text-white/70 mb-8 leading-relaxed animate-fade-up" style={{ animationDelay: '0.1s' }}>
              Aulas ao vivo, cursos gravados e inteligência artificial adaptativa —
              tudo numa só plataforma feita para Moçambique.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <Link
                href="/register"
                className="group inline-flex items-center gap-2.5 bg-primary hover:bg-primary-dark text-white font-black px-7 py-3.5 rounded-2xl text-sm shadow-2xl shadow-primary/40 transition-all hover:scale-105"
              >
                <Crown size={18} />
                Começar gratuitamente
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/courses"
                className="group inline-flex items-center gap-2.5 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white font-semibold px-7 py-3.5 rounded-2xl text-sm transition-all hover:scale-105"
              >
                <Play size={16} />
                Ver todos os cursos
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap items-center gap-4 mb-6 animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex -space-x-2.5">
                {[
                  ['BC','#F47920'], ['HM','#1B3268'], ['FM','#16a34a'],
                  ['PA','#d97706'], ['SR','#7c3aed'],
                ].map(([initials, color], i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0D2B3A] flex items-center justify-center text-[10px] font-bold text-white shadow-md" style={{ background: color as string }}>
                    {initials}
                  </div>
                ))}
              </div>
              <div className="text-white/75 text-sm">
                <span className="text-white font-bold">2.400+</span> estudantes activos
              </div>
              <div className="flex items-center gap-1 bg-white/10 backdrop-blur border border-white/20 rounded-full px-3 py-1">
                <StarRow size={12} />
                <span className="text-white text-xs font-bold ml-1">4.8/5</span>
              </div>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-4 text-white/50 text-xs animate-fade-up" style={{ animationDelay: '0.4s' }}>
              {[
                [CheckCircle, '1ª aula grátis'],
                [Shield,      'Pagamento seguro'],
                [RefreshCcw,  'Garantia 7 dias'],
                [Lock,        'Sem compromisso'],
              ].map(([Icon, label], i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Icon size={12} className="text-primary" />
                  {label as string}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating stat cards — bottom of hero */}
        <div className="relative max-w-5xl mx-auto px-4 pb-10 hidden md:grid grid-cols-4 gap-3">
          {[
            { label: 'Estudantes activos',      value: '2.400+', Icon: Users,      color: 'text-primary' },
            { label: 'Professores verificados', value: '120+',   Icon: Award,      color: 'text-primary' },
            { label: 'Avaliação média',          value: '4.8 ★', Icon: Star,       color: 'text-amber-400' },
            { label: 'Taxa de aprovação',        value: '95%',   Icon: TrendingUp, color: 'text-green-400' },
          ].map(({ label, value, Icon, color }, i) => (
            <div key={i} className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-4 py-3 text-center shadow-xl animate-float" style={{ animationDelay: `${i * 0.2}s` }}>
              <Icon size={18} className={`${color} mx-auto mb-1.5`} />
              <p className="text-xl font-black text-white">{value}</p>
              <p className="text-white/50 text-[11px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Live activity ticker ──────────────────────────────────────── */}
      <section className="bg-secondary py-3 overflow-hidden border-y border-secondary-dark">
        <div className="flex items-center gap-4">
          <div className="shrink-0 bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-sm ml-4 flex items-center gap-1.5 uppercase tracking-widest">
            <span className="relative flex h-1.5 w-1.5 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
            Ao vivo
          </div>
          <div className="ticker-clip flex-1">
            <div className="flex gap-10 animate-ticker whitespace-nowrap">
              {[...activityFeed, ...activityFeed].map((a, i) => (
                <span key={i} className="text-white/60 text-sm shrink-0">
                  🎓 <strong className="text-white">{a.name}</strong> de {a.city}{' '}
                  {a.action} <span className="text-primary">{a.course}</span>
                  <span className="text-white/30 ml-2">· {a.time} atrás</span>
                  <span className="mx-8 text-white/20">|</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Animated stats ───────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { target: 2400, suffix: '+', label: 'Estudantes activos' },
            { target: 120,  suffix: '+', label: 'Professores verificados' },
            { target: 95,   suffix: '%', label: 'Taxa de aprovação' },
            { target: 270,  suffix: '+', label: 'Cursos disponíveis' },
          ].map(({ target, suffix, label }) => (
            <div key={label}>
              <p className="text-4xl font-black text-primary tabular-nums">
                {mounted ? <AnimatedCounter target={target} suffix={suffix} /> : `${target}${suffix}`}
              </p>
              <p className="text-gray-500 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured courses ─────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="badge-orange mb-4 inline-flex"><Flame size={12} /> Cursos mais populares</span>
            <h2 className="text-4xl md:text-5xl font-black text-secondary mb-4">Começa a aprender hoje</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              Cursos criados por professores certificados, com metodologia comprovada e resultados reais.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {featuredCourses.map((c) => {
              const discount = Math.round((1 - c.price / c.originalPrice) * 100)
              return (
                <div key={c.title} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-card-lift hover:-translate-y-1.5 transition-all duration-300">
                  <div className="h-44 relative flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(244,121,32,0.10) 0%, rgba(27,50,104,0.08) 100%)' }}>
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                      <Crown size={28} className="text-white" />
                    </div>
                    <span className={`${c.badge.cls} absolute top-3 left-3`}>{c.badge.label}</span>
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      <Clock size={10} /> {c.scarcity}
                    </div>
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-secondary text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <Award size={9} /> Verificado
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{c.discipline} · {c.level}</div>
                    <h3 className="font-bold text-secondary text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">{c.title}</h3>
                    <p className="text-sm text-gray-500 mb-3">{c.teacher}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-black text-amber-500 text-sm">{c.rating.toFixed(1)}</span>
                      <StarRow size={12} />
                      <span className="text-xs text-gray-400">({c.reviews.toLocaleString()})</span>
                      <span className="text-gray-300 mx-0.5">·</span>
                      <Users size={11} className="text-gray-400" />
                      <span className="text-xs text-gray-400">{c.students.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-4">
                      <TrendingUp size={12} className="text-emerald-600" />
                      <span className="text-xs text-emerald-700 font-semibold">{c.weeklyEnroll} inscrições esta semana</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-2xl font-black text-secondary">{c.price.toLocaleString()} MZN</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-gray-400 line-through">{c.originalPrice.toLocaleString()} MZN</span>
                          <span className="badge-red text-[10px]">-{discount}%</span>
                        </div>
                      </div>
                      <Link href="/courses" className="btn-primary text-sm py-2 px-4 rounded-xl">Inscrever</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-center">
            <Link href="/courses" className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all text-base">
              Ver todos os 270+ cursos <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-secondary mb-4">Como funciona?</h2>
            <p className="text-gray-500 max-w-lg mx-auto text-lg">Três passos simples para começares a tua jornada de aprendizagem.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { step: '01', Icon: Crown,      badge: 'Grátis',    title: 'Cria a tua conta',            desc: 'Regista-te gratuitamente em 30 segundos. Sem cartão de crédito. Sem compromisso.',                           gradient: 'from-primary to-primary-dark',     shadow: 'shadow-orange-200' },
              { step: '02', Icon: Zap,        badge: 'IA',        title: 'A IA encontra o professor ideal', desc: 'O nosso algoritmo analisa o teu nível e objectivos para encontrar o professor perfeito.',               gradient: 'from-secondary to-secondary-light', shadow: 'shadow-blue-200'   },
              { step: '03', Icon: TrendingUp, badge: 'Resultados', title: 'Aprende e evolui',            desc: 'Aulas ao vivo ou gravadas. Progresso em tempo real. Resultados comprovados.',                              gradient: 'from-emerald-500 to-teal-500',     shadow: 'shadow-emerald-200'},
            ].map(({ step, Icon, badge, title, desc, gradient, shadow }) => (
              <div key={step} className="relative">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 shadow-xl ${shadow}`}>
                  <Icon size={26} className="text-white" />
                </div>
                <span className="absolute top-0 right-0 text-7xl font-black text-gray-100 select-none leading-none">{step}</span>
                <span className="badge-orange mb-3 inline-flex">{badge}</span>
                <h3 className="text-xl font-black text-secondary mb-3">{title}</h3>
                <p className="text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features strip ───────────────────────────────────────────── */}
      <section className="py-16 px-4 border-y border-orange-100" style={{ background: 'linear-gradient(135deg, #FEF3E9 0%, #EFF6FF 100%)' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { Icon: Video,    title: 'Aulas ao Vivo',    desc: 'Sessões interactivas em tempo real' },
            { Icon: BookOpen, title: 'Cursos Gravados',  desc: 'Estuda ao teu ritmo, em qualquer hora' },
            { Icon: Zap,      title: 'Match com IA',     desc: 'Professor ideal para o teu nível' },
            { Icon: Globe,    title: 'Multidisciplinar', desc: '12 disciplinas, 270+ cursos' },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center text-center gap-3 p-4">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-md shadow-primary/25">
                <Icon size={22} className="text-white" />
              </div>
              <p className="font-bold text-secondary text-sm">{title}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section id="depoimentos" className="py-24 px-4 bg-gradient-to-br from-slate-50 to-orange-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="badge bg-pink-100 text-pink-700 mb-4 inline-flex"><Heart size={12} fill="currentColor" /> Histórias reais</span>
            <h2 className="text-4xl md:text-5xl font-black text-secondary mb-4">O que dizem os nossos estudantes</h2>
            <div className="flex items-center justify-center gap-2">
              <StarRow size={20} />
              <span className="text-secondary font-black text-lg ml-2">4.8</span>
              <span className="text-gray-400 text-sm">de 2.400+ avaliações verificadas</span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-card-lift hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-[0.06]" style={{ background: 'linear-gradient(135deg, #F47920, #1B3268)' }} />
                <div className="badge-green mb-4 inline-flex"><CheckCircle size={11} fill="currentColor" /> {t.result}</div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>{t.initials}</div>
                  <div className="flex-1">
                    <p className="font-bold text-secondary text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.role} · {t.city}</p>
                  </div>
                  <StarRow size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Disciplines ──────────────────────────────────────────────── */}
      <section id="disciplinas" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black text-secondary mb-4">12 disciplinas. Infinitas possibilidades.</h2>
            <p className="text-gray-500 max-w-lg mx-auto text-lg">Professores certificados em todas as áreas do currículo moçambicano e além.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {disciplines.map((d) => (
              <Link key={d.name} href={`/courses?discipline=${d.name.toLowerCase()}`}
                className={`group flex flex-col items-center gap-2 border-2 ${d.border} bg-gradient-to-br ${d.bg} rounded-2xl p-4 hover:scale-105 hover:shadow-md hover:border-primary transition-all duration-200`}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{d.icon}</span>
                <span className={`text-sm font-bold ${d.text} group-hover:text-primary transition-colors`}>{d.name}</span>
                <span className="text-[11px] text-gray-400 group-hover:text-gray-600 transition-colors">{d.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Guarantee ────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gradient-to-r from-emerald-50 to-green-50 border-y border-emerald-100">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-2xl shadow-green-200">
              <Shield size={40} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md">
              <span className="text-xs font-black text-white">7</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-secondary mb-2">Garantia de satisfação de 7 dias</h3>
            <p className="text-gray-600 mb-5 leading-relaxed">
              Experimenta a Beconnect School sem qualquer risco. Se não ficares completamente satisfeito
              nos primeiros 7 dias, devolvemos o teu dinheiro na totalidade — sem perguntas, sem complicações.
            </p>
            <div className="flex flex-wrap gap-4">
              {['Reembolso total', 'Sem burocracia', 'Sem perguntas', 'Resposta em 24h'].map(item => (
                <div key={item} className="flex items-center gap-1.5 text-emerald-700 text-sm font-semibold">
                  <CheckCircle size={15} fill="currentColor" className="text-emerald-500" /> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA with countdown ──────────────────────────────────── */}
      <section className="py-28 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #061924 0%, #0D2B3A 50%, #1B3268 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse-slow" style={{ background: 'rgba(244,121,32,0.12)' }} />
          <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full blur-3xl animate-pulse-slow" style={{ background: 'rgba(27,50,104,0.30)', animationDelay: '1s' }} />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full border-[40px] opacity-10" style={{ borderColor: '#F47920' }} />
          <div className="absolute inset-0 bg-hero-grid" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 text-primary text-sm font-bold px-4 py-1.5 rounded-full mb-8">
            <Flame size={14} /> Oferta de lançamento termina em:
          </span>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-3 mb-12">
            {[
              { label: 'Horas',   val: mounted ? time.h : 23 },
              { label: 'Minutos', val: mounted ? time.m : 47 },
              { label: 'Segundos',val: mounted ? time.s : 33 },
            ].map(({ label, val }, i) => (
              <div key={i} className="flex items-center gap-3">
                {i > 0 && <span className="text-white/30 text-3xl font-black mb-4">:</span>}
                <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl w-20 h-20 flex flex-col items-center justify-center shadow-xl">
                  <span className="text-3xl font-black tabular-nums text-white leading-none">{String(val).padStart(2, '0')}</span>
                  <span className="text-white/50 text-[10px] uppercase tracking-widest mt-0.5">{label}</span>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
            Começa hoje com{' '}
            <span className="text-primary">40% de desconto</span>
          </h2>
          <p className="text-white/60 mb-10 text-lg max-w-xl mx-auto">
            Mais de 2.400 estudantes já transformaram o seu futuro com a Beconnect School.
            Junta-te agora e aproveita a oferta de lançamento.
          </p>

          <Link
            href="/register"
            className="group inline-flex items-center gap-3 bg-primary hover:bg-primary-dark text-white font-black px-10 py-5 rounded-2xl text-lg shadow-2xl shadow-primary/30 transition-all hover:scale-105"
          >
            <Crown size={24} />
            Quero começar agora
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <p className="mt-6 text-white/30 text-sm">Sem cartão de crédito · Cancela quando quiseres · Garantia de 7 dias</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-secondary text-white/50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <Link href="/"><BcLogo dark /></Link>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              {[['Cursos','/courses'],['Entrar','/login'],['Registar','/register']].map(([label, href]) => (
                <Link key={href} href={href} className="hover:text-white transition-colors">{label}</Link>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/30">
            <p>© {new Date().getFullYear()} Beconnect School. Uma empresa do Grupo Beconnect. Todos os direitos reservados.</p>
            <span className="flex items-center gap-1.5 text-green-400">
              <CheckCircle size={12} /> Pagamentos 100% seguros via M-Pesa
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
