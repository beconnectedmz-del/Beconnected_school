'use client'

import { useEffect, useState, useCallback } from 'react'
import { Shield, RefreshCw, AlertTriangle, Globe, Lock, Eye } from 'lucide-react'
import api from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'

interface ThreatEntry {
  ip: string
  score: number
  last_seen: string
  blocked: boolean
}

export default function AdminSecurityPage() {
  const [threats, setThreats] = useState<ThreatEntry[]>([])
  const [blocked, setBlocked] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [banIp,   setBanIp]   = useState('')
  const [toast,   setToast]   = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [threatsRes, blockedRes] = await Promise.all([
        api.get('/security/threats').catch(() => ({ data: [] })),
        api.get('/security/blocked').catch(() => ({ data: [] })),
      ])
      setThreats(Array.isArray(threatsRes.data) ? threatsRes.data : [])
      setBlocked(Array.isArray(blockedRes.data) ? blockedRes.data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const banIP = async () => {
    if (!banIp.trim()) return
    try {
      await api.post('/security/ban', { ip: banIp.trim(), reason: 'Manual ban by admin' })
      showToast(`IP ${banIp} bloqueado.`)
      setBanIp('')
      await load()
    } catch { showToast('Erro ao bloquear IP.') }
  }

  const unbanIP = async (ip: string) => {
    try {
      await api.post('/security/unban', { ip })
      showToast(`IP ${ip} desbloqueado.`)
      await load()
    } catch { showToast('Erro ao desbloquear IP.') }
  }

  return (
    <AdminLayout>
      <div className="px-6 py-8 max-w-5xl">
        {toast && (
          <div className="fixed top-4 right-4 bg-secondary text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold z-50">
            {toast}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Shield size={22} className="text-primary" /> Centro de Segurança
            </h1>
            <p className="text-gray-400 text-sm mt-1">Monitorização de ameaças e controlo de acesso</p>
          </div>
          <button onClick={load} disabled={loading} className="btn-outline gap-2 text-sm py-2 px-4">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Ameaças detectadas', value: threats.length,                         Icon: AlertTriangle, color: 'text-red-600',   bg: 'bg-red-50'   },
            { label: 'IPs bloqueados',     value: blocked.length,                         Icon: Lock,          color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Em monitorização',   value: threats.filter(t => !t.blocked).length, Icon: Eye,           color: 'text-blue-600',  bg: 'bg-blue-50'  },
          ].map(({ label, value, Icon, color, bg }) => (
            <div key={label} className="card">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-black text-gray-900">{value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Ban IP */}
        <div className="card mb-6">
          <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2">
            <Lock size={16} className="text-primary" /> Bloquear IP manualmente
          </h2>
          <div className="flex gap-3">
            <input
              value={banIp}
              onChange={e => setBanIp(e.target.value)}
              placeholder="Ex: 192.168.1.100"
              className="input flex-1"
              onKeyDown={e => e.key === 'Enter' && banIP()}
            />
            <button onClick={banIP} className="btn-primary px-5">Bloquear</button>
          </div>
        </div>

        {/* Blocked IPs */}
        {blocked.length > 0 && (
          <div className="card mb-6">
            <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <Globe size={16} className="text-red-500" /> IPs Bloqueados ({blocked.length})
            </h2>
            <div className="space-y-2">
              {blocked.map(ip => (
                <div key={ip} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  <span className="font-mono text-sm text-red-700 font-semibold">{ip}</span>
                  <button onClick={() => unbanIP(ip)}
                    className="text-xs text-red-600 hover:text-red-800 font-bold border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg transition-colors">
                    Desbloquear
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Threats */}
        <div className="card">
          <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Ameaças recentes
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : threats.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Shield size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhuma ameaça detectada</p>
              <p className="text-xs mt-1">A plataforma está segura</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left py-2 px-2 text-xs font-bold text-gray-400 uppercase">IP</th>
                    <th className="text-center py-2 px-2 text-xs font-bold text-gray-400 uppercase">Score</th>
                    <th className="text-center py-2 px-2 text-xs font-bold text-gray-400 uppercase">Estado</th>
                    <th className="py-2 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {threats.map(t => (
                    <tr key={t.ip} className="hover:bg-gray-50">
                      <td className="py-2 px-2 font-mono text-sm">{t.ip}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`font-bold ${t.score > 70 ? 'text-red-600' : t.score > 40 ? 'text-amber-600' : 'text-gray-600'}`}>
                          {t.score}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {t.blocked
                          ? <span className="badge badge-red">Bloqueado</span>
                          : <span className="badge badge-orange">Em monitorização</span>}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {!t.blocked && (
                          <button onClick={() => banIP()}
                            className="text-xs text-red-600 hover:text-red-800 font-bold border border-red-200 px-2 py-1 rounded-lg">
                            Bloquear
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
