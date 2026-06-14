'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  BookOpen, CheckCircle, XCircle, Clock, ArrowUpRight,
  Search, RefreshCw, Star, Users,
} from 'lucide-react'
import api from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'

interface Course {
  id: string | number[]
  title: string
  description: string
  level: string
  price: number
  lesson_type: string
  enrolled_count: number
  teacher_name: string
  discipline_name: string
  avg_rating: number
  review_count: number
  is_published: boolean
  is_validated: boolean
  is_featured: boolean
  created_at: string
}

function courseId(id: string | number[] | undefined | null): string {
  if (!id) return ''
  if (typeof id === 'string') return id
  if (!Array.isArray(id)) return String(id)
  const hex = Array.from(id).map(b => (b as number).toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Iniciante', intermediate: 'Intermédio', advanced: 'Avançado', basic: 'Básico',
}

export default function AdminCoursesPage() {
  const [courses,      setCourses]      = useState<Course[]>([])
  const [filtered,     setFiltered]     = useState<Course[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'published' | 'draft'>('all')
  const [actionId,     setActionId]     = useState<string | null>(null)
  const [toast,        setToast]        = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/courses?page_size=100')
      setCourses(res.data.data || [])
    } catch {
      setCourses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let list = courses
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.teacher_name?.toLowerCase().includes(q) ||
        c.discipline_name?.toLowerCase().includes(q)
      )
    }
    if (statusFilter === 'pending')   list = list.filter(c => c.is_published && !c.is_validated)
    if (statusFilter === 'published') list = list.filter(c => c.is_published && c.is_validated)
    if (statusFilter === 'draft')     list = list.filter(c => !c.is_published)
    setFiltered(list)
  }, [courses, search, statusFilter])

  const validate = async (id: string, validated: boolean) => {
    setActionId(id)
    try {
      await api.post(`/admin/courses/${id}/validate`, { validated })
      showToast(validated ? 'Curso validado!' : 'Validação removida.')
      await load()
    } catch {
      showToast('Erro ao validar curso.')
    } finally {
      setActionId(null)
    }
  }

  const pending   = courses.filter(c => c.is_published && !c.is_validated).length
  const published = courses.filter(c => c.is_published && c.is_validated).length
  const drafts    = courses.filter(c => !c.is_published).length

  return (
    <AdminLayout>
      <div className="px-6 py-8 max-w-7xl">
        {toast && (
          <div className="fixed top-4 right-4 bg-secondary text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold z-50 animate-fade-in">
            {toast}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <BookOpen size={22} className="text-primary" /> Gestão de Cursos
            </h1>
            <p className="text-gray-400 text-sm mt-1">{courses.length} cursos na plataforma</p>
          </div>
          <button onClick={load} disabled={loading} className="btn-outline gap-2 text-sm py-2 px-4">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total',      value: courses.length, color: 'text-gray-900',    bg: 'bg-gray-100',    filter: 'all'       as const },
            { label: 'A validar',  value: pending,        color: 'text-amber-700',   bg: 'bg-amber-50',    filter: 'pending'   as const },
            { label: 'Publicados', value: published,      color: 'text-emerald-700', bg: 'bg-emerald-50',  filter: 'published' as const },
            { label: 'Rascunhos',  value: drafts,         color: 'text-gray-600',    bg: 'bg-gray-50',     filter: 'draft'     as const },
          ].map(({ label, value, color, bg, filter }) => (
            <button key={label} onClick={() => setStatusFilter(filter)}
              className={`card text-left hover:shadow-md transition-all ${statusFilter === filter ? 'ring-2 ring-primary' : ''}`}>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por título, professor ou disciplina…"
              className="input pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all','pending','published','draft'] as const).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === f
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-primary/50'
                }`}>
                {f === 'all' ? 'Todos' : f === 'pending' ? 'A validar' : f === 'published' ? 'Publicados' : 'Rascunhos'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum curso encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">Curso</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase hidden lg:table-cell">Professor</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase hidden md:table-cell">Disciplina</th>
                    <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase hidden sm:table-cell">Inscritos</th>
                    <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase hidden sm:table-cell">Avaliação</th>
                    <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">Estado</th>
                    <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => {
                    const id   = courseId(c.id)
                    const busy = actionId === id
                    return (
                      <tr key={id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-900 leading-tight max-w-[220px] truncate">{c.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{LEVEL_LABELS[c.level] || c.level} · {c.price?.toLocaleString()} MZN</p>
                        </td>
                        <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">{c.teacher_name}</td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className="badge badge-blue">{c.discipline_name}</span>
                        </td>
                        <td className="py-3 px-4 text-center hidden sm:table-cell">
                          <span className="flex items-center justify-center gap-1 text-gray-700 font-semibold">
                            <Users size={12} className="text-gray-400" /> {c.enrolled_count || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center hidden sm:table-cell">
                          {Number(c.avg_rating) > 0 ? (
                            <span className="flex items-center justify-center gap-1 text-amber-600 font-bold">
                              <Star size={12} fill="currentColor" /> {Number(c.avg_rating).toFixed(1)}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {!c.is_published && <span className="badge bg-gray-100 text-gray-500">Rascunho</span>}
                            {c.is_published && !c.is_validated && (
                              <span className="badge badge-orange flex items-center gap-1"><Clock size={9} /> A validar</span>
                            )}
                            {c.is_published && c.is_validated && (
                              <span className="badge badge-green flex items-center gap-1"><CheckCircle size={9} /> Validado</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {c.is_published && !c.is_validated && (
                              <button onClick={() => validate(id, true)} disabled={busy} title="Validar"
                                className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center disabled:opacity-50">
                                {busy ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={14} />}
                              </button>
                            )}
                            {c.is_validated && (
                              <button onClick={() => validate(id, false)} disabled={busy} title="Remover validação"
                                className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center disabled:opacity-50">
                                {busy ? <RefreshCw size={13} className="animate-spin" /> : <XCircle size={14} />}
                              </button>
                            )}
                            <Link href={`/courses/${id}`} target="_blank" title="Ver curso"
                              className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center">
                              <ArrowUpRight size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
