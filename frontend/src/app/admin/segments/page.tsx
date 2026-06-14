'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Plus, X, Layers, CheckCircle, Lock, Users } from 'lucide-react'
import api from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'

interface Segment {
  id: string
  name: string
  description?: string
  criteria: Record<string, unknown>
  member_count: number
  is_system: boolean
  last_computed_at?: string
  created_at: string
}

function getCriteriaLabel(criteria: Record<string, unknown>): string {
  if (criteria.type === 'all') return 'Todos os utilizadores'
  if (criteria.type === 'inactive') return `Inativos há ${criteria.days ?? 30}+ dias`
  if (criteria.type === 'new_leads') return `Novos leads (${criteria.days ?? 7} dias)`
  const pkg = criteria.package_type
  if (pkg === 'basic')   return 'Subscritores Básico (500 MZN/mês)'
  if (pkg === 'lite')    return 'Subscritores Lite (1.500 MZN/mês)'
  if (pkg === 'premium') return 'Subscritores Premium (3.500 MZN/mês)'
  return JSON.stringify(criteria)
}

const CRITERIA_OPTIONS = [
  { value: 'all',      label: 'Todos os utilizadores' },
  { value: 'basic',    label: 'Subscritores Básico (500 MZN/mês)' },
  { value: 'lite',     label: 'Subscritores Lite (1.500 MZN/mês)' },
  { value: 'premium',  label: 'Subscritores Premium (3.500 MZN/mês)' },
  { value: 'inactive', label: 'Inativos há 30+ dias' },
  { value: 'new_leads',label: 'Novos leads (últimos 7 dias)' },
]

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [toast,    setToast]    = useState('')
  const [form, setForm] = useState({ name: '', description: '', criteria_type: 'all' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/segments').catch(() => ({ data: [] }))
      setSegments(Array.isArray(res.data) ? res.data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createSegment = async () => {
    if (!form.name) { showToast('Preencha o nome do segmento.'); return }
    try {
      const type = form.criteria_type
      let criteria: Record<string, unknown>
      if (type === 'all')       criteria = { type: 'all' }
      else if (type === 'inactive')  criteria = { type: 'inactive',  days: 30 }
      else if (type === 'new_leads') criteria = { type: 'new_leads', days: 7 }
      else                           criteria = { package_type: type }

      await api.post('/admin/segments', {
        name:        form.name,
        description: form.description,
        criteria,
      })
      showToast('Segmento criado!')
      setShowForm(false)
      setForm({ name: '', description: '', criteria_type: 'all' })
      await load()
    } catch { showToast('Erro ao criar segmento.') }
  }

  const systemSegs = segments.filter(s => s.is_system)
  const customSegs = segments.filter(s => !s.is_system)

  return (
    <AdminLayout>
      <div className="px-6 py-8 max-w-6xl">
        {toast && (
          <div className="fixed top-4 right-4 bg-secondary text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold z-50">
            {toast}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Layers size={22} className="text-primary" /> Segmentação
            </h1>
            <p className="text-gray-400 text-sm mt-1">Grupos de utilizadores para campanhas dirigidas</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="btn-outline p-2.5">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowForm(true)} className="btn-primary gap-2 text-sm py-2 px-4">
              <Plus size={15} /> Novo Segmento
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* System segments */}
            {systemSegs.length > 0 && (
              <div className="mb-8">
                <h2 className="font-black text-gray-600 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Lock size={12} /> Segmentos do sistema
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {systemSegs.map(seg => (
                    <div key={seg.id} className="card border-dashed border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                          <Users size={18} className="text-secondary" />
                        </div>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Lock size={9} /> Sistema
                        </span>
                      </div>
                      <h3 className="font-black text-gray-900 mb-1">{seg.name}</h3>
                      {seg.description && (
                        <p className="text-xs text-gray-500 mb-3">{seg.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-400">{getCriteriaLabel(seg.criteria)}</span>
                        <span className="text-lg font-black text-secondary">{seg.member_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom segments */}
            <div>
              {customSegs.length > 0 && (
                <h2 className="font-black text-gray-600 text-xs uppercase tracking-widest mb-4">
                  Segmentos personalizados
                </h2>
              )}
              {customSegs.length === 0 ? (
                <div className="card text-center py-12">
                  <Layers size={40} className="mx-auto mb-3 text-gray-200" />
                  <h3 className="font-bold text-gray-500 mb-1">Sem segmentos personalizados</h3>
                  <p className="text-gray-400 text-sm mb-4">Crie segmentos para enviar campanhas dirigidas.</p>
                  <button onClick={() => setShowForm(true)} className="btn-primary gap-2 inline-flex">
                    <Plus size={15} /> Criar Segmento
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customSegs.map(seg => (
                    <div key={seg.id} className="card">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <Users size={18} className="text-primary" />
                      </div>
                      <h3 className="font-black text-gray-900 mb-1">{seg.name}</h3>
                      {seg.description && (
                        <p className="text-xs text-gray-500 mb-3">{seg.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-400">{getCriteriaLabel(seg.criteria)}</span>
                        <span className="text-lg font-black text-primary">{seg.member_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Create segment modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-black text-gray-900">Novo Segmento</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nome *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Alunos de Matemática" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                  <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Descrição opcional" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Critério de inclusão</label>
                  <select value={form.criteria_type} onChange={e => setForm({ ...form, criteria_type: e.target.value })} className="input">
                    {CRITERIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <button onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
                <button onClick={createSegment} className="btn-primary gap-2">
                  <CheckCircle size={15} /> Criar Segmento
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
