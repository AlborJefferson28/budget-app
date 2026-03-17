import { useEffect, useMemo, useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useWallets } from '../hooks/useWallets'
import { useAccounts } from '../hooks/useAccounts'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { Search, Plus, Edit, Trash2, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCOP, parseCOP } from '../lib/currency'
import { accountTransfersService, walletsService } from '../services'

export default function Transactions({ accountId, setPage }) {
  const { user } = useAuth()
  const { accounts } = useAccounts()
  const { transactions, loading, error, createTransaction, updateTransaction, deleteTransaction, refetch: refetchTransactions } = useTransactions(accountId)
  const { wallets, refetch: refetchWallets } = useWallets(accountId)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ from_wallet: '', to_wallet: '', amount: 0, type: 'transfer' })
  const [editing, setEditing] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('Todas')
  const [personalSourceWallets, setPersonalSourceWallets] = useState([])
  const [sourceLoading, setSourceLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const activeAccount = useMemo(
    () => accounts.find(account => account.id === accountId) || null,
    [accounts, accountId]
  )
  const isSharedContext = activeAccount?.kind === 'shared' || activeAccount?.owner_id !== user?.id

  const originWalletOptions = useMemo(() => {
    const activeOptions = wallets.map(wallet => ({
      ...wallet,
      account_name: activeAccount?.name || 'Current account',
      source_type: 'active',
    }))

    const personalOptions = personalSourceWallets.map(wallet => ({
      ...wallet,
      source_type: 'personal',
    }))

    return [...activeOptions, ...personalOptions]
  }, [wallets, personalSourceWallets, activeAccount?.name])

  const destinationWalletOptions = wallets

  useEffect(() => {
    if (!showForm) return

    const loadPersonalWallets = async () => {
      if (!isSharedContext) {
        setPersonalSourceWallets([])
        setSourceLoading(false)
        return
      }

      const personalAccounts = accounts.filter(account =>
        account.owner_id === user?.id &&
        account.id !== accountId &&
        account.kind !== 'shared'
      )

      if (personalAccounts.length === 0) {
        setPersonalSourceWallets([])
        setSourceLoading(false)
        return
      }

      setSourceLoading(true)
      const responses = await Promise.all(
        personalAccounts.map(async (account) => {
          const { data, error: walletError } = await walletsService.getByAccount(account.id)
          return { account, data, error: walletError }
        })
      )

      const firstError = responses.find(item => item.error)?.error
      if (firstError) {
        setFormError(firstError.message || 'Could not load personal wallets.')
        setPersonalSourceWallets([])
        setSourceLoading(false)
        return
      }

      const options = responses.flatMap(({ account, data }) =>
        (data || []).map(wallet => ({
          ...wallet,
          account_name: account.name,
        }))
      )

      setPersonalSourceWallets(options)
      setSourceLoading(false)
    }

    loadPersonalWallets()
  }, [showForm, isSharedContext, accounts, user?.id, accountId])

  useEffect(() => {
    if (!showForm || editing) return
    setFormData(prev => ({
      ...prev,
      from_wallet: prev.from_wallet || originWalletOptions[0]?.id || '',
      to_wallet: prev.to_wallet || destinationWalletOptions[0]?.id || '',
    }))
  }, [showForm, editing, originWalletOptions, destinationWalletOptions])

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setFormError('')
    setFormData({ from_wallet: '', to_wallet: '', amount: 0, type: 'transfer' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const amount = parseCOP(formData.amount)
    if (amount <= 0) {
      setFormError('Ingresa un monto válido mayor a 0.')
      return
    }

    if (editing) {
      await updateTransaction(editing.id, { ...formData, amount })
      setEditing(null)
    } else {
      const fromWallet = originWalletOptions.find(wallet => wallet.id === formData.from_wallet)
      const toWallet = destinationWalletOptions.find(wallet => wallet.id === formData.to_wallet)

      if (!fromWallet || !toWallet) {
        setFormError('Selecciona wallets válidas de origen y destino.')
        return
      }

      const isCrossAccountContribution = fromWallet.account_id !== accountId && toWallet.account_id === accountId

      if (isCrossAccountContribution) {
        const { error: contributionError } = await accountTransfersService.contributeToSharedAccount({
          fromWalletId: fromWallet.id,
          toWalletId: toWallet.id,
          amount,
          note: 'Contribution from Transactions',
        })

        if (contributionError) {
          setFormError(contributionError.message || 'No fue posible procesar el aporte entre cuentas.')
          return
        }

        await Promise.all([refetchTransactions(), refetchWallets()])
      } else {
        await createTransaction({ ...formData, amount })
      }
    }

    closeForm()
  }

  const handleEdit = (transaction) => {
    setFormError('')
    setEditing(transaction)
    setFormData({
      from_wallet: transaction.from_wallet || '',
      to_wallet: transaction.to_wallet || '',
      amount: transaction.amount,
      type: transaction.type
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
      await deleteTransaction(id)
    }
  }

  const getWalletName = (walletId) => {
    if (!walletId) return ''
    return wallets.find(wallet => wallet.id === walletId)?.name || shortWalletId(walletId)
  }

  const shortWalletId = (walletId) => {
    if (!walletId) return ''
    return `${walletId.slice(0, 6)}...${walletId.slice(-4)}`
  }

  const filteredTransactions = transactions.filter(transaction => {
    const search = searchTerm.toLowerCase()
    const fromName = getWalletName(transaction.from_wallet).toLowerCase()
    const toName = getWalletName(transaction.to_wallet).toLowerCase()
    const matchesSearch = transaction.type.toLowerCase().includes(search) ||
      fromName.includes(search) ||
      toName.includes(search)
    const matchesFilter = filter === 'Todas' || transaction.type === filter.toLowerCase()
    return matchesSearch && matchesFilter
  })

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'transfer': return <ArrowRightLeft className="w-5 h-5" />
      case 'income': return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'expense': return <TrendingDown className="w-5 h-5 text-red-600" />
      default: return <ArrowRightLeft className="w-5 h-5" />
    }
  }

  const getTransactionColor = (type) => {
    switch (type) {
      case 'income': return 'text-green-600'
      case 'expense': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  if (loading) return <div className="flex justify-center items-center h-64">Cargando...</div>
  if (error) return <div className="text-red-500">Error: {error.message}</div>

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Transacciones</h1>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Transacción
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Buscar transacciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['Todas', 'Transferencias', 'Ingresos', 'Gastos'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="shrink-0"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors cursor-pointer" onClick={() => setShowForm(true)}>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <Plus className="w-12 h-12 text-gray-400 mb-2" />
            <p className="text-gray-500">Crear nueva transacción</p>
          </CardContent>
        </Card>

        {filteredTransactions.map(transaction => (
          <Card key={transaction.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                {getTransactionIcon(transaction.type)}
                {transaction.type === 'transfer' ? 'Transferencia' : transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">
                {transaction.type === 'transfer' 
                  ? `De ${getWalletName(transaction.from_wallet)} a ${getWalletName(transaction.to_wallet)}`
                  : `Wallet: ${getWalletName(transaction.from_wallet || transaction.to_wallet)}`
                }
              </p>
              <p className={`text-2xl font-bold mb-2 ${getTransactionColor(transaction.type)}`}>
                {formatCOP(transaction.amount)}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {new Date(transaction.created_at).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(transaction)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(transaction.id)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editing ? 'Editar Transacción' : 'Nueva Transacción'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                {isSharedContext && personalSourceWallets.length > 0 && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    Puedes usar wallets personales como origen para aportar a esta cuenta compartida.
                  </div>
                )}

                <Select value={formData.from_wallet} onValueChange={(value) => setFormData({ ...formData, from_wallet: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar billetera origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {originWalletOptions.map(wallet => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.icon} {wallet.name}
                        {wallet.source_type === 'personal' ? ` (Personal: ${wallet.account_name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={formData.to_wallet} onValueChange={(value) => setFormData({ ...formData, to_wallet: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar billetera destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationWalletOptions.map(wallet => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.icon} {wallet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Monto"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseCOP(e.target.value) })}
                  required
                />
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Gasto</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <Button type="submit" className="w-full sm:w-auto" disabled={sourceLoading}>
                    {editing ? 'Actualizar' : 'Crear'}
                  </Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeForm}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Button variant="outline" onClick={() => setPage('dashboard')}>
          Volver al Dashboard
        </Button>
      </div>
    </div>
  )
}
