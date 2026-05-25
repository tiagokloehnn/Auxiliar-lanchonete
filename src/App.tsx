import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { NovaComandaModal } from './components/NovaComandaModal'
import { ToastContainer } from './components/ToastContainer'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { Dashboard } from './pages/Dashboard'
import { Historico } from './pages/Historico'
import { Rastreamento } from './pages/Rastreamento'
import { Motoboy } from './pages/Motoboy'
import { PainelMotoboy } from './pages/PainelMotoboy'
import { Login } from './pages/Login'
import { Admin } from './pages/Admin'
import { useComandas, calcularAlerta } from './hooks/useComandas'
import { useToasts } from './hooks/useToasts'
import type { Comanda } from './types'

function MainApp() {
  const [modalAberto, setModalAberto] = useState(false)
  const { ativas, filaEntrega, historico, criarComanda, finalizarComanda, confirmarEntregaRealizada, cancelarComanda, excluirComanda, limparHistorico } = useComandas()
  const { toasts, addToast, removeToast, resetAlerta } = useToasts()

  const totalExpiradas = ativas.filter((c: Comanda) => calcularAlerta(c).level === 'expirada').length

  const handleAlerta = useCallback((
    comanda: Comanda,
    minutosRestantes: number,
    tipo: 'atencao' | 'urgente' | 'expirada'
  ) => {
    addToast({ comandaNumero: comanda.numero, cliente: comanda.cliente, mesa: comanda.mesa, minutosRestantes, tipo })
  }, [addToast])

  async function handleCriarComanda(dados: Parameters<typeof criarComanda>[0]): Promise<string> {
    return await criarComanda(dados)
  }

  async function handleFinalizar(id: number) {
    const comanda = ativas.find((c: Comanda) => c.id === id)
    if (comanda) resetAlerta(comanda.numero)
    await finalizarComanda(id)
  }

  async function handleCancelar(id: number) {
    const comanda = ativas.find((c: Comanda) => c.id === id)
    if (comanda) resetAlerta(comanda.numero)
    await cancelarComanda(id)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header
        totalAtivas={ativas.length}
        totalExpiradas={totalExpiradas}
        onNovaComanda={() => setModalAberto(true)}
      />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard ativas={ativas} onFinalizar={handleFinalizar} onCancelar={handleCancelar} onAlerta={handleAlerta} onNovaComanda={() => setModalAberto(true)} />} />
          <Route path="/rastreamento" element={<Rastreamento filaEntrega={filaEntrega} onConfirmarEntrega={confirmarEntregaRealizada} />} />
          <Route path="/historico" element={<Historico historico={historico} onExcluir={excluirComanda} onLimpar={limparHistorico} />} />
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <Admin />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      {modalAberto && <NovaComandaModal onSalvar={handleCriarComanda} onFechar={() => setModalAberto(false)} />}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/motoboy/:numero" element={<Motoboy />} />
          <Route path="/painel-motoboy" element={<PainelMotoboy />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
