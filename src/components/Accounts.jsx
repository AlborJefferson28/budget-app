import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, BriefcaseBusiness, CirclePlus, Copy, Info, Pencil, PiggyBank, Plus, QrCode, ShieldCheck, Trash2, User, UserPlus, Users } from 'lucide-react'
import { useAccounts } from '../hooks/useAccounts'
import { useAuth } from '../contexts/AuthContext'
import { accountMembersService, accountTransfersService, usersService, walletsService } from '../services'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { formatCOP, formatCOPInput, formatCOPInputFromRaw, normalizeCOPAmount } from '../lib/currency'
import { AccountsSkeleton } from './RouteSkeletons'
import AccountModal from './modals/AccountModal'
import MembersModal from './modals/MembersModal'
import ContributionModal from './modals/ContributionModal'

const CARD_VISUALS = [
  { icon: PiggyBank, container: 'bg-primary/10 text-primary' },
  { icon: Users, container: 'bg-muted text-foreground' },
  { icon: BriefcaseBusiness, container: 'bg-accent text-foreground' },
]

const MEMBER_ROLE_OPTIONS = [
  { value: 'member', label: 'Miembro', icon: User },
  { value: 'admin', label: 'Admin', icon: ShieldCheck },
]
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const formatDate = (date) => {
  if (!date) return 'Sin fecha'
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return 'Sin fecha'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(parsedDate)
}

const formatDateTime = (date) => {
  if (!date) return 'Sin fecha'
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-CO', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate)
}

const getErrorMessage = (error, fallback) => {
  if (!error) return fallback
  if (error.code === '23505') return 'This user is already a member of the account.'
  return error.message || fallback
}

const getProfileName = (profileData) => {
  if (Array.isArray(profileData)) {
    return profileData[0]?.name || ''
  }
  return profileData?.name || ''
}

export default function Accounts({ setPage, setSelectedAccount }) {
  const { accounts, loading, error, createAccount, updateAccount, deleteAccount, notifyAccountsChanged } = useAccounts()
  const { user } = useAuth()

  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)

  const [showMembersModal, setShowMembersModal] = useState(false)
  const [membersAccount, setMembersAccount] = useState(null)
  const [showContributionModal, setShowContributionModal] = useState(false)
  const [contributionAccount, setContributionAccount] = useState(null)
  const [transfers, setTransfers] = useState([])
  const [transfersLoading, setTransfersLoading] = useState(false)
  const [transfersError, setTransfersError] = useState('')
  const [transferFilterAccount, setTransferFilterAccount] = useState('all')
  const [walletNamesById, setWalletNamesById] = useState({})
  const [searchAccounts, setSearchAccounts] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [searchTransfers, setSearchTransfers] = useState('')

  const currentUserLabel = useMemo(() => {
    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name
    if (fullName) return fullName
    if (user?.email) return user.email.split('@')[0]
    return 'Tú'
  }, [user])

  const isOwnerAccount = (account) => account?.owner_id === user?.id
  const getAccountRole = (account) => (isOwnerAccount(account) ? 'owner' : 'contributor')
  const getAccountRoleLabel = (account) => (getAccountRole(account) === 'owner' ? 'Propietario' : 'Contribuyente')
  const getAccountParticipantsCount = (account) => {
    if (Number.isFinite(account?.participants_count)) return account.participants_count
    return account?.owner_id === user?.id
      ? (account?.kind === 'shared' ? 2 : 1)
      : 2
  }
  const isOwnerOfMembersAccount = membersAccount?.owner_id === user?.id
  const isSharedAccount = (account) => getAccountParticipantsCount(account) > 1
  const accountNamesById = useMemo(() => {
    const map = {}
    accounts.forEach(account => { map[account.id] = account.name })
    return map
  }, [accounts])

  const filteredAccounts = useMemo(() => {
    let result = [...accounts]

    if (searchAccounts) {
      const lowerSearch = searchAccounts.toLowerCase()
      result = result.filter(account => account.name.toLowerCase().includes(lowerSearch))
    }

    result.sort((a, b) => {
      let comparison = 0
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortField === 'date') {
        comparison = (new Date(a.created_at || 0)) - (new Date(b.created_at || 0))
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [accounts, searchAccounts, sortField, sortOrder])

  const filteredTransfers = useMemo(() => {
    let result = [...transfers]

    if (transferFilterAccount !== 'all') {
      result = result.filter(transfer =>
        transfer.from_account_id === transferFilterAccount || transfer.to_account_id === transferFilterAccount
      )
    }

    if (searchTransfers) {
      const lowerSearch = searchTransfers.toLowerCase()
      result = result.filter(transfer => {
        const fromAcc = getAccountDisplayName(transfer.from_account_id).toLowerCase()
        const toAcc = getAccountDisplayName(transfer.to_account_id).toLowerCase()
        const note = (transfer.note || '').toLowerCase()
        return fromAcc.includes(lowerSearch) || toAcc.includes(lowerSearch) || note.includes(lowerSearch)
      })
    }

    return result
  }, [transfers, transferFilterAccount, searchTransfers, accountNamesById])


  const getAccountDisplayName = (accountId) => accountNamesById[accountId] || 'Cuenta'
  const getWalletDisplayName = (walletId) => walletNamesById[walletId] || 'Billetera'
  const getRoleOption = (role) => MEMBER_ROLE_OPTIONS.find(item => item.value === role) || MEMBER_ROLE_OPTIONS[0]
  const getTransferAuthorLabel = (createdBy) => {
    if (!createdBy) return 'Usuario eliminado'
    if (createdBy === user?.id) return `${currentUserLabel} (Tú)`
    return 'Usuario'
  }

  const loadTransfersHistory = async () => {
    setTransfersLoading(true)
    setTransfersError('')

    const { data: transfersData, error: transfersLoadError } = await accountTransfersService.getRecent(120)
    if (transfersLoadError) {
      setTransfers([])
      setTransfersError(getErrorMessage(transfersLoadError, 'Could not load transfers history.'))
      setTransfersLoading(false)
      return
    }

    setTransfers(transfersData || [])

    if (accounts.length === 0) {
      setWalletNamesById({})
      setTransfersLoading(false)
      return
    }

    const walletResponses = await Promise.all(
      accounts.map(async (account) => {
        const response = await walletsService.getByAccount(account.id)
        return { accountId: account.id, ...response }
      })
    )

    const walletLookup = {}
    walletResponses.forEach(({ data }) => {
      ;(data || []).forEach(wallet => {
        walletLookup[wallet.id] = wallet.name
      })
    })
    setWalletNamesById(walletLookup)

    const walletsError = walletResponses.find(item => item.error)?.error
    if (walletsError && !transfersLoadError) {
      setTransfersError(getErrorMessage(walletsError, 'Some wallet names could not be loaded.'))
    }

    setTransfersLoading(false)
  }

  useEffect(() => {
    if (loading) return
    loadTransfersHistory()
  }, [loading, accounts])

  const openCreateForm = () => {
    setEditingAccount(null)
    setShowModal(true)
  }


  const handleEdit = (account) => {
    setEditingAccount(account)
    setShowModal(true)
  }

  const openMembersModal = (account) => {
    setMembersAccount(account)
    setShowMembersModal(true)
  }

  const openContributionModal = (account) => {
    setContributionAccount(account)
    setShowContributionModal(true)
  }

  if (loading) {
    return <AccountsSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-base text-destructive">Error: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-0 pb-8 sm:px-2">
      <section className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Tus cuentas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Elige una cuenta para gestionar tus finanzas o crea una nueva.
            </p>
          </div>
          <Button
            onClick={openCreateForm}
            className="h-11 w-full rounded-2xl bg-primary text-primary-foreground px-6 text-sm font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 lg:w-auto"
          >
            <Plus className="mr-2 h-5 w-5" />
            Crear cuenta
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar cuenta..."
              value={searchAccounts}
              onChange={e => setSearchAccounts(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="date">Fecha</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-10 p-0"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>
      </section>

      <AccountModal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingAccount(null)
        }}
        editingAccount={editingAccount}
        onCreateAccount={createAccount}
        onUpdateAccount={updateAccount}
        onDeleteAccount={deleteAccount}
        onSuccess={() => {}}
      />

      <MembersModal
        open={showMembersModal}
        onClose={() => {
          setShowMembersModal(false)
          setMembersAccount(null)
        }}
        account={membersAccount}
        currentUser={user}
        onAccountUpdate={updateAccount}
        onNotifyChanges={notifyAccountsChanged}
      />

      <ContributionModal
        open={showContributionModal}
        onClose={() => {
          setShowContributionModal(false)
          setContributionAccount(null)
        }}
        targetAccount={contributionAccount}
        accounts={accounts}
        currentUser={user}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filteredAccounts.map((account, index) => {
          const visual = CARD_VISUALS[index % CARD_VISUALS.length]
          const Icon = visual.icon
          const isPrimary = isOwnerAccount(account)
          const isShared = isSharedAccount(account)
          const roleLabel = getAccountRoleLabel(account)
          const ownerLabel = isPrimary ? `${currentUserLabel} (Tú)` : 'Otro usuario'

          return (
            <article
              key={account.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_6px_20px_rgba(15,23,42,0.06)]"
            >
              <div className={`flex h-40 items-center justify-center ${visual.container}`}>
                <Icon className="h-14 w-14" strokeWidth={1.8} />
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="break-words text-xl font-bold text-foreground">{account.name}</h3>
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className={`rounded-lg px-3 py-1 text-xs font-bold tracking-[0.12em] ${isPrimary ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                      {roleLabel}
                    </span>
                    <span className={`rounded-lg px-3 py-1 text-xs font-bold tracking-[0.12em] ${isShared ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {isShared ? 'Compartida' : 'Personal'}
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">Propietario: {ownerLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">Tu acceso: {roleLabel}</p>
                <p className="mt-1 text-sm italic text-muted-foreground">Creada: {formatDate(account.created_at)}</p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openMembersModal(account)}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                    >
                      <UserPlus className="h-5 w-5" />
                      Gestionar miembros
                    </button>

                    {isShared && !isPrimary && (
                      <button
                        type="button"
                        onClick={() => openContributionModal(account)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Aportar
                      </button>
                    )}

                    {isPrimary ? (
                      <button
                        type="button"
                        onClick={() => handleEdit(account)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        Solo lectura
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedAccount(account.id)
                      setPage('wallets')
                    }}
                    className="h-10 min-w-[120px] rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                  >
                    Abrir
                  </Button>
                </div>
              </div>
            </article>
          )
        })}

        <button
          type="button"
          onClick={openCreateForm}
          className="flex min-h-[240px] sm:min-h-[356px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/60 px-6 sm:px-10 text-center transition-colors hover:border-primary/40 hover:bg-card"
        >
          <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Plus className="h-10 w-10" />
          </span>
          <h3 className="text-xl font-bold text-foreground">Agregar otra cuenta</h3>
          <p className="mt-2 text-sm text-muted-foreground">Gestiona múltiples fondos por separado</p>
        </button>
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Historial de aportes</h2>
              <p className="text-sm text-muted-foreground">Transferencias entre cuentas.</p>
            </div>
            <div className="w-full sm:w-72">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Filtrar por cuenta</label>
              <select
                value={transferFilterAccount}
                onChange={(e) => setTransferFilterAccount(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todas las cuentas</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex-1">
            <Input
              placeholder="Buscar en historial (nota, cuenta...)"
              value={searchTransfers}
              onChange={e => setSearchTransfers(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {transfersError && (
          <div className="mb-4 rounded-md border border-secondary bg-secondary/40 px-3 py-2 text-sm text-secondary-foreground">
            {transfersError}
          </div>
        )}

        {transfersLoading ? (
          <p className="text-sm text-muted-foreground">Cargando aportes...</p>
        ) : filteredTransfers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay aportes registrados.</p>
        ) : (
          <div className="space-y-3">
            {filteredTransfers.slice(0, 40).map(transfer => (
              <article key={transfer.id} className="rounded-lg border border-border p-3 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {getAccountDisplayName(transfer.from_account_id)} ({getWalletDisplayName(transfer.from_wallet_id)}) {'->'} {getAccountDisplayName(transfer.to_account_id)} ({getWalletDisplayName(transfer.to_wallet_id)})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Por {getTransferAuthorLabel(transfer.created_by)} - {formatDateTime(transfer.created_at)}
                    </p>
                    {transfer.note && (
                      <p className="mt-1 text-xs text-muted-foreground">Nota: {transfer.note}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-primary">{formatCOP(transfer.amount)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 flex flex-col gap-4 rounded-xl border border-border bg-card px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Info className="h-4 w-4" />
          </span>
          <p className="text-sm leading-relaxed">
            ¿Necesitas ayuda configurando una cuenta empresarial?
            <button type="button" className="ml-1 font-semibold text-primary hover:text-primary/80">
              Contactar soporte
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
