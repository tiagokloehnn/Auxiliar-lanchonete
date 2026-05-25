import { useState, useEffect, FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth, type Profile } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import db from '../db'

type Aba = 'usuarios' | 'pedidos' | 'configuracoes'

const CHAVES_CONFIG = ['nome_pizzaria', 'telefone', 'tempo_limite_padrao_mins'] as const
type ChaveConfig = typeof CHAVES_CONFIG[number]
const LABELS_CONFIG: Record<ChaveConfig, string> = {
  nome_pizzaria: 'Nome da pizzaria',
  telefone: 'Telefone',
  tempo_limite_padrao_mins: 'Tempo limite padrão (minutos)',
}

export function Admin() {
  const { profile } = useAuth()
  const [aba, setAba] = useState<Aba>('usuarios')

  if (profile?.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-400">Acesso restrito a administradores.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-black text-white mb-4">Painel Admin</h2>

      <div className="flex gap-1 mb-6 bg-slate-900 rounded-xl p-1 border border-slate-800">
        {(['usuarios', 'pedidos', 'configuracoes'] as Aba[]).map(a => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
              aba === a ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {a === 'usuarios' ? 'Usuários' : a === 'pedidos' ? 'Pedidos' : 'Configurações'}
          </button>
        ))}
      </div>

      {aba === 'usuarios' && <AbaUsuarios />}
      {aba === 'pedidos' && <AbaPedidos />}
      {aba === 'configuracoes' && <AbaConfiguracoes />}
    </div>
  )
}

// ─── Aba Usuários ───────────────────────────────────────────────────────────

function AbaUsuarios() {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [novoAberto, setNovoAberto] = useState(false)

  async function carregar() {
    setCarregando(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at')
    if (error) setErro(error.message)
    else setUsuarios((data as Profile[]) ?? [])
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  async function toggleAtivo(u: Profile) {
    await supabase.from('profiles').update({ ativo: !u.ativo }).eq('id', u.id)
    setUsuarios(prev => prev.map(p => p.id === u.id ? { ...p, ativo: !p.ativo } : p))
  }

  async function alterarRole(u: Profile, role: 'admin' | 'funcionario' | 'motoboy') {
    await supabase.from('profiles').update({ role }).eq('id', u.id)
    setUsuarios(prev => prev.map(p => p.id === u.id ? { ...p, role } : p))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setNovoAberto(true)}
          className="bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          + Novo usuário
        </button>
      </div>

      {erro && <p className="text-red-400 text-sm">{erro}</p>}

      {carregando ? (
        <p className="text-slate-500 text-sm">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {usuarios.map(u => (
            <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{u.nome}</p>
                <p className="text-slate-500 text-xs truncate">{u.id}</p>
              </div>

              <select
                value={u.role}
                onChange={e => alterarRole(u, e.target.value as 'admin' | 'funcionario' | 'motoboy')}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="funcionario">Funcionário</option>
                <option value="motoboy">Motoboy</option>
                <option value="admin">Admin</option>
              </select>

              <button
                onClick={() => toggleAtivo(u)}
                className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                  u.ativo
                    ? 'bg-green-900/40 text-green-400 hover:bg-red-900/40 hover:text-red-400'
                    : 'bg-red-900/40 text-red-400 hover:bg-green-900/40 hover:text-green-400'
                }`}
              >
                {u.ativo ? 'Ativo' : 'Inativo'}
              </button>
            </div>
          ))}
        </div>
      )}

      {novoAberto && <ModalNovoUsuario onFechar={() => setNovoAberto(false)} onSalvo={carregar} />}
    </div>
  )
}

interface ModalNovoUsuarioProps {
  onFechar: () => void
  onSalvo: () => void
}

function ModalNovoUsuario({ onFechar, onSalvo }: ModalNovoUsuarioProps) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState<'admin' | 'funcionario'>('funcionario')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres'); return }
    setErro('')
    setCarregando(true)

    // Salva sessão do admin antes do signUp, pois se confirmação de email estiver
    // desativada o Supabase faz login automático como o novo usuário
    const { data: { session: sessaoAdmin } } = await supabase.auth.getSession()

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, role } },
    })

    // Restaura sessão do admin independente do resultado
    if (sessaoAdmin) {
      await supabase.auth.setSession({
        access_token: sessaoAdmin.access_token,
        refresh_token: sessaoAdmin.refresh_token,
      })
    }

    setCarregando(false)
    if (error) { setErro(error.message); return }
    onSalvo()
    onFechar()
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h3 className="font-black text-white text-lg">Novo usuário</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm"
            placeholder="Nome"
            value={nome}
            onChange={e => setNome(e.target.value)}
            required
          />
          <input
            type="email"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm"
            placeholder="Senha (mín. 6 caracteres)"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            required
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'admin' | 'funcionario')}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
          >
            <option value="funcionario">Funcionário</option>
            <option value="admin">Admin</option>
          </select>

          {erro && <p className="text-red-400 text-sm">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {carregando ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>

        <p className="text-slate-500 text-xs">
          O usuário receberá um email de confirmação. Desative a confirmação de email no Supabase para uso imediato.
        </p>
      </div>
    </div>
  )
}

// ─── Aba Pedidos ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  ativa: 'Ativa',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
  aguardando_entrega: 'Aguard. entrega',
}

const STATUS_COLOR: Record<string, string> = {
  ativa: 'text-green-400',
  finalizada: 'text-slate-400',
  cancelada: 'text-red-400',
  aguardando_entrega: 'text-yellow-400',
}

function AbaPedidos() {
  const todas = useLiveQuery(() => db.comandas.orderBy('criadaEm').reverse().toArray(), [])
  const [filtro, setFiltro] = useState<string>('todas')

  const filtradas = filtro === 'todas' ? todas : todas?.filter(c => c.status === filtro)

  const counts = {
    ativa: todas?.filter(c => c.status === 'ativa').length ?? 0,
    finalizada: todas?.filter(c => c.status === 'finalizada').length ?? 0,
    cancelada: todas?.filter(c => c.status === 'cancelada').length ?? 0,
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(['ativa', 'finalizada', 'cancelada'] as const).map(s => (
          <div key={s} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <p className={`text-xl font-black ${STATUS_COLOR[s]}`}>{counts[s]}</p>
            <p className="text-slate-500 text-xs mt-0.5">{STATUS_LABEL[s]}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        {['todas', 'ativa', 'finalizada', 'cancelada', 'aguardando_entrega'].map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filtro === f ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {f === 'todas' ? 'Todas' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {filtradas?.map(c => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">#{c.numero} — {c.cliente}</p>
              <p className="text-slate-500 text-xs">
                {new Date(c.criadaEm).toLocaleString('pt-BR')}
                {c.mesa && ` · Mesa ${c.mesa}`}
              </p>
            </div>
            <span className={`text-xs font-bold ${STATUS_COLOR[c.status]}`}>
              {STATUS_LABEL[c.status]}
            </span>
          </div>
        ))}
        {filtradas?.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">Nenhuma comanda encontrada.</p>
        )}
      </div>
    </div>
  )
}

// ─── Aba Configurações ───────────────────────────────────────────────────────

function AbaConfiguracoes() {
  const [valores, setValores] = useState<Record<ChaveConfig, string>>({
    nome_pizzaria: '',
    telefone: '',
    tempo_limite_padrao_mins: '30',
  })
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('pizzaria_config')
    if (saved) setValores(JSON.parse(saved))
  }, [])

  function handleSalvar(e: FormEvent) {
    e.preventDefault()
    localStorage.setItem('pizzaria_config', JSON.stringify(valores))
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  return (
    <form onSubmit={handleSalvar} className="space-y-4">
      {CHAVES_CONFIG.map(chave => (
        <div key={chave}>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">
            {LABELS_CONFIG[chave]}
          </label>
          <input
            type={chave === 'tempo_limite_padrao_mins' ? 'number' : 'text'}
            value={valores[chave]}
            onChange={e => setValores(prev => ({ ...prev, [chave]: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors text-sm"
            placeholder={LABELS_CONFIG[chave]}
          />
        </div>
      ))}

      <button
        type="submit"
        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors"
      >
        {salvo ? 'Salvo!' : 'Salvar configurações'}
      </button>
    </form>
  )
}
