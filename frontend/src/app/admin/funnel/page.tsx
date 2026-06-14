'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw, User, Mail, Phone, Globe, TrendingDown, Target,
} from 'lucide-react'
import api from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'

interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  source?: string
  status: string
  notes?: string
  created_at: string
}

const STAGES = [
  { key: 'new',       label: 'Novos',        color: 'bg-blue-500' },
  { key: 'contacted', label: 'Contactados',  color: 'bg-primary'  },
  { key: 'qualified', label: 'Qualificados', color: 'bg-purple-500' },
  { key: 'converted', label: 'Convertidos',  color: 'bg-emerald-500' },
]

const STATUS_LABELS: Record<string, string> = {
  new: 'Novo', contacted: 'Contactado', qualified: 'Qualificado',
  converted: 'Convertido', lost: 'Perdido', unsubscribed: 'Desinscrito',
}

export default function FunnelPage() {
  const [leads,    setLeads]    = useState<Lead[]>([])
  const [filter,   setFilter]   = useState('all')
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [toast,    setToast]    = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/leads?page=1&page_size=200').catch(() => ({ data: { data: [] } }))
      const data = res.data?.data ?? res.data ?? []
      setLeads(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    try {
      await api.put(`/admin/leads/${id}`, { status })
      showToast('Estado actualizado!')
      await load()
    } catch {
      showToast('Erro ao actualizar estado.')
    } finally {
      setUpdating(null)
    }
  }

  const count   = (status: string) => leads.filter(l => l.status === status).length
  const total   = leads.length
  const converted = count('converted')
  const convRate  = total > 0 ? ((converted / total) * 100).toFixed(1) : '0'
  const displayed = filter === 'all' ? leads : leads.filter(l => l.status === filter)

  return (
    <AdminLayout>
      <div className="px-6 py-8 max-w-7xl">
        {toast && (
          <div className="fixed top-4 right-4 bg-secondary text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold z-50">
            {toast}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Target size={22} className="text-primary" /> Funil de Vendas
            </h1>
            <p className="text-gray-400 text-sm mt-1">Pipeline de leads e conversão</p>
          </div>
          <button onClick={load} disabled={loading} className="btn-outline gap-2 text-sm py-2 px-4">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        {/* Visual funnel */}
        <div className="card mb-8">
          <h2 className="font-black text-gray-900 mb-6">Funil de Conversão</h2>
          <div className="flex items-end gap-3 overflow-x-auto pb-2">
            {STAGES.map((stage, i) => {
              const stageCount = count(stage.key)
              const prevCount  = i === 0 ? total : count(STAGES[i - 1].key)
              const pct        = prevCount > 0 ? ((stageCount / prevCount) * 100).toFixed(0) : '0'
              const barH       = total > 0 ? Math.max(24, (stageCount / Math.max(total, 1)) * 180) : 24
              return (
                <div key={stage.key} className="flex flex-col items-center flex-1 min-w-[80px]">
                  {i > 0 && (
                    <div className="flex items-center justify-center mb-1 text-xs text-gray-400">
                      <TrendingDown size={10} className="mr-0.5" /> {pct}%
                    </div>
                  )}
                  <div
                    className={`${stage.color} rounded-t-xl w-full transition-all duration-700 opacity-85`}
                    style={{ height: `${barH}px` }}
                  />
                  <div className="mt-2 text-center">
                    <p className="text-2xl font-black text-gray-900">{stageCount}</p>
                    <p className="text-xs text-gray-500">{stage.label}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary row */}
          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold">Total leads</p>
              <p className="text-2xl font-black text-gray-900">{total}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold">Convertidos</p>
              <p className="text-2xl font-black text-emerald-600">{converted}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold">Perdidos</p>
              <p className="text-2xl font-black text-red-500">{count('lost')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold">Taxa conversão</p>
              <p className="text-2xl font-black text-primary">{convRate}%</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-secondary text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            Todos ({total})
          </button>
          {[...STAGES, { key: 'lost', label: 'Perdidos', color: '' }].map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === s.key ? 'bg-secondary text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {s.label} ({count(s.key)})
            </button>
          ))}
        </div>

        {/* Leads table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <User size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sem leads nesta fase</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">Lead</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase hidden sm:table-cell">Fonte</th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">Estado</th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">Mover para</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900">{lead.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Mail size={10} /> {lead.email}
                        {lead.phone && <><Phone size={10} className="ml-1" /> {lead.phone}</>}
                      </p>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Globe size={10} /> {lead.source || 'Orgânico'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge ${
                        lead.status === 'converted' ? 'badge-green'  :
                        lead.status === 'qualified' ? 'badge-blue'   :
                        lead.status === 'contacted' ? 'badge-orange' :
                        lead.status === 'lost'      ? 'badge-red'    :
                        'bg-gray-100 text-gray-500'
                      }`}>{STATUS_LABELS[lead.status] ?? lead.status}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={lead.status}
                        disabled={updating === lead.id}
                        onChange={e => updateStatus(lead.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                      >
                        <option value="new">Novo</option>
                        <option value="contacted">Contactado</option>
                        <option value="qualified">Qualificado</option>
                        <option value="converted">Convertido</option>
                        <option value="lost">Perdido</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
