'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, Plus, Users, CheckCircle, Clock,
  BarChart3, DollarSign, Eye, EyeOff, X,
} from 'lucide-react'
import api from '@/lib/api'
import TeacherLayout from '@/components/TeacherLayout'

interface Course {
  id: string
  title: string
  description?: string
  discipline?: string
  discipline_id?: string
  level: string
  lesson_type?: string
  price?: number
  total_hours?: number
  total_lessons?: number
  enrolled_count?: number
  total_enrollments?: number
  monthly_revenue?: number
  is_published: boolean
  is_validated?: boolean
}

interface Discipline {
  id: string
  name: string
  slug: string
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Básico',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-purple-100 text-purple-700',
}

const LESSON_TYPE_LABELS: Record<string, string> = {
  recorded: 'Gravadas',
  live: 'Ao vivo',
  hybrid: 'Híbrido',
}

const GRADIENTS: Record<string, string> = {
  matematica:   'from-blue-500 to-indigo-600',
  programacao:  'from-emerald-500 to-teal-600',
  ingles:       'from-amber-500 to-orange-500',
  fisica:       'from-cyan-500 to-blue-600',
  quimica:      'from-purple-500 to-violet-600',
  biologia:     'from-green-500 to-emerald-600',
  historia:     'from-rose-500 to-pink-600',
  geografia:    'from-orange-500 to-amber-600',
  default:      'from-gray-400 to-gray-600',
}

function getDisciplineGradient(discipline?: string) {
  if (!discipline) return GRADIENTS.default
  const key = discipline.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return GRADIENTS[key] ?? GRADIENTS.default
}

type FilterTab = 'todos' | 'publicados' | 'rascunhos' | 'pendentes'

export default function TeacherCoursesPage() {
  const [courses,     setCourses]     = useState<Course[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [tab,         setTab]         = useState<FilterTab>('todos')
  const [showModal,   setShowModal]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', discipline_id: '',
    level: 'beginner', lesson_type: 'recorded',
    price: '', total_hours: '',
  })

  const fetchCourses = () => {
    setLoading(true)
    api.get('/teacher/my-courses')
      .then(r => setCourses(r.data || []))
      .catch(() => setError('Não foi possível carregar os cursos.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCourses()
    api.get('/disciplines')
      .then(r => setDisciplines(r.data || []))
      .catch(() => {})
  }, [])

  const filtered = courses.filter(c => {
    if (tab === 'publicados') return c.is_published
    if (tab === 'rascunhos')  return !c.is_published && c.is_validated !== false
    if (tab === 'pendentes')  return c.is_validated === false
    return true
  })

  const handlePublish = async (id: string, currentlyPublished: boolean) => {
    try {
      await api.post(`/courses/${id}/publish`, { published: !currentlyPublished })
      setCourses(prev => prev.map(c => c.id === id ? { ...c, is_published: !currentlyPublished } : c))
    } catch {
      alert('Erro ao alterar estado de publicação.')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      await api.post('/courses', {
        title:        form.title,
        description:  form.description,
        discipline_id: form.discipline_id || undefined,
        level:        form.level,
        lesson_type:  form.lesson_type,
        price:        parseFloat(form.price) || 0,
        total_hours:  parseFloat(form.total_hours) || 0,
      })
      setShowModal(false)
      setForm({ title: '', description: '', discipline_id: '', level: 'beginner', lesson_type: 'recorded', price: '', total_hours: '' })
      fetchCourses()
    } catch {
      alert('Erro ao criar curso. Verifique os dados e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'todos',      label: 'Todos'       },
    { key: 'publicados', label: 'Publicados'  },
    { key: 'rascunhos',  label: 'Rascunhos'   },
    { key: 'pendentes',  label: 'Pendentes'   },
  ]

  return (
    <TeacherLayout>
      <div className="px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Meus Cursos</h1>
            <p className="text-gray-400 text-sm mt-1">{courses.length} curso{courses.length !== 1 ? 's' : ''} no total</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary gap-2 text-sm py-2.5 px-5 self-start sm:self-auto shadow-lg shadow-primary/20">
            <Plus size={16} /> Novo Curso
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="card text-center py-12 text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-700 mb-1">Nenhum curso encontrado</p>
            <p className="text-gray-400 text-sm mb-4">
              {tab === 'todos' ? 'Cria o teu primeiro curso clicando em "+ Novo Curso".' : `Não tens cursos na categoria "${tab}".`}
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex gap-2">
              <Plus size={16} /> Criar Curso
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(c => {
              const enrolled = c.enrolled_count ?? c.total_enrollments ?? 0
              const gradient = getDisciplineGradient(c.discipline)
              let statusChip = <span className="badge bg-gray-100 text-gray-600">Rascunho</span>
              if (c.is_validated === false && !c.is_published) {
                statusChip = <span className="badge bg-yellow-100 text-yellow-700">Aguarda validação</span>
              } else if (c.is_published) {
                statusChip = <span className="badge badge-green"><CheckCircle size={9} /> Publicado</span>
              }

              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  {/* Thumbnail */}
                  <div className={`bg-gradient-to-br ${gradient} h-32 flex items-center justify-center`}>
                    <BookOpen size={36} className="text-white/80" />
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start gap-2 mb-2 flex-wrap">
                      {c.discipline && <span className="badge bg-indigo-100 text-indigo-700">{c.discipline}</span>}
                      <span className={`badge ${LEVEL_COLORS[c.level] ?? 'bg-gray-100 text-gray-600'}`}>
                        {LEVEL_LABELS[c.level] ?? c.level}
                      </span>
                      {statusChip}
                    </div>

                    <h3 className="font-bold text-gray-900 text-sm leading-snug mb-3 line-clamp-2">{c.title}</h3>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                          <Users size={11} />
                        </div>
                        <p className="text-xs font-bold text-gray-900">{enrolled}</p>
                        <p className="text-[10px] text-gray-400">Inscritos</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                          <BookOpen size={11} />
                        </div>
                        <p className="text-xs font-bold text-gray-900">{c.total_lessons ?? '—'}</p>
                        <p className="text-[10px] text-gray-400">Aulas</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                          <DollarSign size={11} />
                        </div>
                        <p className="text-xs font-bold text-gray-900">{(c.monthly_revenue ?? 0).toLocaleString('pt-MZ')}</p>
                        <p className="text-[10px] text-gray-400">MZN/mês</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto">
                      <Link href={`/teacher/courses/${c.id}`} className="flex-1 btn-outline text-xs py-2 text-center gap-1 flex items-center justify-center">
                        <BarChart3 size={13} /> Gerir
                      </Link>
                      <button
                        onClick={() => handlePublish(c.id, c.is_published)}
                        className={`flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-lg font-semibold transition-colors border ${c.is_published ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                      >
                        {c.is_published ? <><EyeOff size={13} /> Despublicar</> : <><Eye size={13} /> Publicar</>}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Course Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">Novo Curso</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="input w-full"
                  placeholder="Ex: Matemática para o 12° Ano"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input w-full h-24 resize-none"
                  placeholder="Descreve o conteúdo e objectivos do curso..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Disciplina</label>
                <select
                  value={form.discipline_id}
                  onChange={e => setForm(f => ({ ...f, discipline_id: e.target.value }))}
                  className="input w-full"
                >
                  <option value="">Seleccionar disciplina</option>
                  {disciplines.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nível</label>
                  <select
                    value={form.level}
                    onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="beginner">Básico</option>
                    <option value="intermediate">Intermédio</option>
                    <option value="advanced">Avançado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Aulas</label>
                  <select
                    value={form.lesson_type}
                    onChange={e => setForm(f => ({ ...f, lesson_type: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="recorded">Gravadas</option>
                    <option value="live">Ao vivo</option>
                    <option value="hybrid">Híbrido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Preço (MZN)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="input w-full"
                    placeholder="Ex: 2500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Total de Horas</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.total_hours}
                    onChange={e => setForm(f => ({ ...f, total_hours: e.target.value }))}
                    className="input w-full"
                    placeholder="Ex: 40"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-outline">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="flex-1 btn-primary">
                  {submitting ? 'A criar...' : 'Criar Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TeacherLayout>
  )
}
