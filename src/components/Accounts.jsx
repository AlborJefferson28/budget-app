import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, BriefcaseBusiness, CirclePlus, Info, Pencil, PiggyBank, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { useAccounts } from '../hooks/useAccounts'
import { useAuth } from '../contexts/AuthContext'
import { accountMembersService, accountTransfersService, usersService, walletsService } from '../services'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { formatCOP, parseCOP } from '../lib/currency'
import { AccountsSkeleton } from './RouteSkeletons'

const CARD_VISUALS = [
  { icon: PiggyBank, container: 'bg-primary/10 text-primary' },
  { icon: Users, container: 'bg-muted text-foreground' },
  { icon: BriefcaseBusiness, container: 'bg-accent text-foreground' },
]

const MEMBER_ROLES = ['member', 'admin']
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const QUICK_AMOUNT_STEPS = [10000, 50000, 100000]

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

const normalizeCOPAmount = (value) => {
  const parsed = parseCOP(value)
  return Math.max(0, Math.round(parsed))
}

const getProfileName = (profileData) => {
  if (Array.isArray(profileData)) {
    return profileData[0]?.name || ''
  }
  return profileData?.name || ''
}

const shortId = (id) => {
  if (!id) return ''
  if (id.length <= 14) return id
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

export default function Accounts({ setPage, setSelectedAccount }) {
  const { accounts, loading, error, createAccount, updateAccount, deleteAccount } = useAccounts()
  const { user } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '' })
  const [editing, setEditing] = useState(null)

  const [showMembersModal, setShowMembersModal] = useState(false)
  const [membersAccount, setMembersAccount] = useState(null)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersBusy, setMembersBusy] = useState(false)
  const [membersError, setMembersError] = useState('')
  const [membersNotice, setMembersNotice] = useState('')
  const [memberForm, setMemberForm] = useState({ identifier: '', role: 'member' })

  const [showContributionModal, setShowContributionModal] = useState(false)
  const [contributionAccount, setContributionAccount] = useState(null)
  const [sourceWallets, setSourceWallets] = useState([])
  const [targetWallets, setTargetWallets] = useState([])
  const [contributionLoading, setContributionLoading] = useState(false)
  const [contributionSubmitting, setContributionSubmitting] = useState(false)
  const [contributionError, setContributionError] = useState('')
  const [contributionNotice, setContributionNotice] = useState('')
  const [contributionForm, setContributionForm] = useState({
    from_wallet: '',
    to_wallet: '',
    amount: '0',
    note: '',
  })
  const [transfers, setTransfers] = useState([])
  const [transfersLoading, setTransfersLoading] = useState(false)
  const [transfersError, setTransfersError] = useState('')
  const [transferFilterAccount, setTransferFilterAccount] = useState('all')
  const [walletNamesById, setWalletNamesById] = useState({})

  const currentUserLabel = useMemo(() => {
    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name
    if (fullName) return fullName
    if (user?.email) return user.email.split('@')[0]
    return 'Tú'
  }, [user])

  const isOwnerOfMembersAccount = membersAccount?.owner_id === user?.id
  const isSharedAccount = (account) => account?.kind === 'shared' || account?.owner_id !== user?.id
  const accountNamesById = useMemo(() => {
    const map = {}
    accounts.forEach(account => { map[account.id] = account.name })
    return map
  }, [accounts])

  const filteredTransfers = useMemo(() => {
    if (transferFilterAccount === 'all') return transfers
    return transfers.filter(transfer =>
      transfer.from_account_id === transferFilterAccount || transfer.to_account_id === transferFilterAccount
    )
  }, [transfers, transferFilterAccount])

  const getAccountDisplayName = (accountId) => accountNamesById[accountId] || shortId(accountId)
  const getWalletDisplayName = (walletId) => walletNamesById[walletId] || shortId(walletId)
  const getTransferAuthorLabel = (createdBy) => {
    if (!createdBy) return 'Usuario eliminado'
    if (createdBy === user?.id) return `${currentUserLabel} (Tú)`
    return shortId(createdBy)
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
    setEditing(null)
    setFormData({ name: '' })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setFormData({ name: '' })
  }

  const loadMembers = async (accountId) => {
    if (!accountId) return

    setMembersLoading(true)
    setMembersError('')

    const { data, error: membersLoadError } = await accountMembersService.getByAccount(accountId)

    if (membersLoadError) {
      setMembersError(getErrorMessage(membersLoadError, 'Could not load account members.'))
      setMembers([])
    } else {
      setMembers(data || [])
    }

    setMembersLoading(false)
  }

  const openMembersModal = async (account) => {
    setMembersAccount(account)
    setMembers([])
    setMembersError('')
    setMembersNotice('')
    setMemberForm({ identifier: '', role: 'member' })
    setShowMembersModal(true)
    await loadMembers(account.id)
  }

  const closeMembersModal = () => {
    setShowMembersModal(false)
    setMembersAccount(null)
    setMembers([])
    setMembersError('')
    setMembersNotice('')
    setMemberForm({ identifier: '', role: 'member' })
  }

  const closeContributionModal = () => {
    setShowContributionModal(false)
    setContributionAccount(null)
    setSourceWallets([])
    setTargetWallets([])
    setContributionLoading(false)
    setContributionSubmitting(false)
    setContributionError('')
    setContributionNotice('')
    setContributionForm({
      from_wallet: '',
      to_wallet: '',
      amount: '0',
      note: '',
    })
  }

  const openContributionModal = async (targetAccount) => {
    setContributionAccount(targetAccount)
    setShowContributionModal(true)
    setContributionLoading(true)
    setContributionError('')
    setContributionNotice('')

    const personalSourceAccounts = accounts.filter(account =>
      account.owner_id === user?.id &&
      account.id !== targetAccount.id &&
      account.kind !== 'shared'
    )

    if (personalSourceAccounts.length === 0) {
      setSourceWallets([])
      setTargetWallets([])
      setContributionError('Create at least one personal account with funds to contribute.')
      setContributionLoading(false)
      return
    }

    const sourceWalletResponses = await Promise.all(
      personalSourceAccounts.map(async (account) => {
        const response = await walletsService.getByAccount(account.id)
        return { account, ...response }
      })
    )

    const sourceError = sourceWalletResponses.find(item => item.error)?.error
    if (sourceError) {
      setContributionError(getErrorMessage(sourceError, 'Could not load source wallets.'))
      setContributionLoading(false)
      return
    }

    const sourceWalletOptions = sourceWalletResponses.flatMap(({ account, data }) =>
      (data || []).map(wallet => ({
        ...wallet,
        account_name: account.name,
      }))
    )

    const { data: destinationWallets, error: destinationError } = await walletsService.getByAccount(targetAccount.id)
    if (destinationError) {
      setContributionError(getErrorMessage(destinationError, 'Could not load destination wallets.'))
      setContributionLoading(false)
      return
    }

    const sharedWalletOptions = destinationWallets || []

    if (sourceWalletOptions.length === 0) {
      setContributionError('No wallets found in your personal accounts.')
    } else if (sharedWalletOptions.length === 0) {
      setContributionError('The shared account has no destination wallets yet.')
    }

    setSourceWallets(sourceWalletOptions)
    setTargetWallets(sharedWalletOptions)
    setContributionForm({
      from_wallet: sourceWalletOptions[0]?.id || '',
      to_wallet: sharedWalletOptions[0]?.id || '',
      amount: '0',
      note: '',
    })
    setContributionLoading(false)
  }

  const resolveUserId = async (identifier) => {
    const value = identifier.trim()
    if (!value) {
      return { userId: null, error: 'Enter an email or user UUID.' }
    }

    if (UUID_REGEX.test(value)) {
      return { userId: value, error: null }
    }

    if (value.includes('@')) {
      const { data, error: userLookupError } = await usersService.getByEmail(value)
      if (userLookupError) {
        return {
          userId: null,
          error: getErrorMessage(userLookupError, 'Could not resolve user by email.'),
        }
      }
      if (!data?.id) {
        return { userId: null, error: 'No user found with that email.' }
      }
      return { userId: data.id, error: null }
    }

    return { userId: null, error: 'Use a valid email or UUID.' }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { name: formData.name.trim() }
    if (!payload.name) return

    if (editing) {
      await updateAccount(editing.id, payload)
      setEditing(null)
    } else {
      await createAccount(payload)
    }

    closeForm()
  }

  const handleEdit = (account) => {
    setEditing(account)
    setFormData({ name: account.name })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta cuenta?')) {
      await deleteAccount(id)
      closeForm()
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!membersAccount) return

    if (!isOwnerOfMembersAccount) {
      setMembersError('Only the account owner can manage members.')
      return
    }

    setMembersBusy(true)
    setMembersError('')
    setMembersNotice('')

    const { userId, error: resolveError } = await resolveUserId(memberForm.identifier)
    if (resolveError) {
      setMembersError(resolveError)
      setMembersBusy(false)
      return
    }

    if (userId === membersAccount.owner_id) {
      setMembersError('The owner is already part of this account.')
      setMembersBusy(false)
      return
    }

    if (members.some(member => member.user_id === userId)) {
      setMembersError('This user is already listed as a member.')
      setMembersBusy(false)
      return
    }

    const { error: addError } = await accountMembersService.addMember(membersAccount.id, userId, memberForm.role)

    if (addError) {
      setMembersError(getErrorMessage(addError, 'Could not add member.'))
    } else {
      if (membersAccount.kind !== 'shared') {
        await updateAccount(membersAccount.id, { kind: 'shared' })
        setMembersAccount(prev => prev ? { ...prev, kind: 'shared' } : prev)
      }
      setMemberForm({ identifier: '', role: 'member' })
      setMembersNotice('Member added successfully.')
      await loadMembers(membersAccount.id)
    }

    setMembersBusy(false)
  }

  const handleContributionSubmit = async (e) => {
    e.preventDefault()
    if (!contributionAccount) return

    const parsedAmount = normalizeCOPAmount(contributionForm.amount)
    if (!contributionForm.from_wallet || !contributionForm.to_wallet) {
      setContributionError('Select source and destination wallets.')
      return
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setContributionError('Enter a valid amount greater than 0.')
      return
    }

    setContributionSubmitting(true)
    setContributionError('')
    setContributionNotice('')

    const { data, error: transferError } = await accountTransfersService.contributeToSharedAccount({
      fromWalletId: contributionForm.from_wallet,
      toWalletId: contributionForm.to_wallet,
      amount: parsedAmount,
      note: contributionForm.note.trim(),
    })

    if (transferError) {
      setContributionError(getErrorMessage(transferError, 'Could not process contribution.'))
    } else {
      setContributionNotice(`Contribution completed. Transfer id: ${shortId(data)}`)
      setContributionForm(prev => ({ ...prev, amount: '0', note: '' }))
      await loadTransfersHistory()
    }

    setContributionSubmitting(false)
  }

  const applyContributionAmountDelta = (delta) => {
    const nextValue = Math.max(0, normalizeCOPAmount(contributionForm.amount) + delta)
    setContributionForm(prev => ({ ...prev, amount: String(nextValue) }))
  }

  const handleUpdateMemberRole = async (member, role) => {
    if (!membersAccount || !isOwnerOfMembersAccount || role === member.role) return

    setMembersBusy(true)
    setMembersError('')
    setMembersNotice('')

    const { error: roleError } = await accountMembersService.updateRole(membersAccount.id, member.user_id, role)

    if (roleError) {
      setMembersError(getErrorMessage(roleError, 'Could not update member role.'))
    } else {
      setMembers(prevMembers => prevMembers.map(item => (
        item.user_id === member.user_id ? { ...item, role } : item
      )))
      setMembersNotice('Role updated.')
    }

    setMembersBusy(false)
  }

  const handleRemoveMember = async (member) => {
    if (!membersAccount || !isOwnerOfMembersAccount) return

    if (!window.confirm(`Remove ${getProfileName(member.profiles) || shortId(member.user_id)} from this account?`)) {
      return
    }

    setMembersBusy(true)
    setMembersError('')
    setMembersNotice('')

    const { error: removeError } = await accountMembersService.removeMember(membersAccount.id, member.user_id)

    if (removeError) {
      setMembersError(getErrorMessage(removeError, 'Could not remove member.'))
    } else {
      setMembers(prevMembers => prevMembers.filter(item => item.user_id !== member.user_id))
      setMembersNotice('Member removed.')
    }

    setMembersBusy(false)
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
      <section className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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
          <CirclePlus className="mr-2 h-5 w-5" />
          Crear cuenta
        </Button>
      </section>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editing ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
            <div className="mb-5">
              <label className="block text-sm mb-1">Nombre</label>
              <Input
                type="text"
                placeholder="Nombre de la cuenta"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-2 justify-end">
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDelete(editing.id)}
                  className="mr-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              )}
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit">{editing ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </form>
        </div>
      )}

      {showMembersModal && membersAccount && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-lg p-5 sm:p-8 w-full max-w-3xl relative max-h-[88vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-1">Gestionar miembros</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cuenta: <span className="font-semibold text-foreground">{membersAccount.name}</span>
            </p>

            {membersError && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {membersError}
              </div>
            )}

            {membersNotice && (
              <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                {membersNotice}
              </div>
            )}

            <div className="mb-4 rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owner</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="font-semibold text-foreground">
                  {membersAccount.owner_id === user?.id ? `${currentUserLabel} (Tú)` : shortId(membersAccount.owner_id)}
                </p>
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-foreground">owner</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{membersAccount.owner_id}</p>
            </div>

            {isOwnerOfMembersAccount ? (
              <form onSubmit={handleAddMember} className="mb-6 rounded-lg border border-border p-4">
                <p className="mb-3 text-sm font-medium text-foreground">Agregar miembro</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_auto] md:items-end">
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">Email o UUID del usuario</label>
                    <Input
                      type="text"
                      placeholder="member@email.com or UUID"
                      value={memberForm.identifier}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, identifier: e.target.value }))}
                      disabled={membersBusy}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">Rol</label>
                    <select
                      value={memberForm.role}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value }))}
                      disabled={membersBusy}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {MEMBER_ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  <Button type="submit" disabled={membersBusy} className="h-10">
                    {membersBusy ? 'Agregando...' : 'Agregar'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mb-6 rounded-md border border-secondary bg-secondary/40 px-3 py-2 text-sm text-secondary-foreground">
                Puedes ver miembros, pero solo el propietario puede modificarlos.
              </div>
            )}

            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">Current Members</p>

              {membersLoading ? (
                <p className="text-sm text-muted-foreground">Cargando miembros...</p>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay miembros agregados.</p>
              ) : (
                <div className="space-y-3">
                  {members.map(member => {
                    const displayName = getProfileName(member.profiles) || shortId(member.user_id)
                    const isCurrentUser = member.user_id === user?.id

                    return (
                      <div key={member.user_id} className="rounded-lg border border-border p-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-foreground">
                              {displayName} {isCurrentUser ? '(Tú)' : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.user_id}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Added: {formatDate(member.created_at)}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={member.role}
                              disabled={!isOwnerOfMembersAccount || membersBusy}
                              onChange={(e) => handleUpdateMemberRole(member, e.target.value)}
                              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {MEMBER_ROLES.map(role => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>

                            {isOwnerOfMembersAccount && (
                              <Button
                                type="button"
                                variant="outline"
                                disabled={membersBusy}
                                onClick={() => handleRemoveMember(member)}
                                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto"
                              >
                                Eliminar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="button" variant="outline" onClick={closeMembersModal}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      {showContributionModal && contributionAccount && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-lg p-5 sm:p-8 w-full max-w-2xl relative max-h-[88vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-1">Aportar a cuenta compartida</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cuenta destino: <span className="font-semibold text-foreground">{contributionAccount.name}</span>
            </p>

            {contributionError && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {contributionError}
              </div>
            )}
            {contributionNotice && (
              <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                {contributionNotice}
              </div>
            )}

            {contributionLoading ? (
              <p className="text-sm text-muted-foreground">Cargando opciones de aporte...</p>
            ) : (
              <form onSubmit={handleContributionSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Desde billetera personal</label>
                  <select
                    value={contributionForm.from_wallet}
                    onChange={(e) => setContributionForm(prev => ({ ...prev, from_wallet: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={contributionSubmitting || sourceWallets.length === 0}
                  >
                    {sourceWallets.map(wallet => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.account_name}) - {formatCOP(wallet.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Hacia billetera compartida</label>
                  <select
                    value={contributionForm.to_wallet}
                    onChange={(e) => setContributionForm(prev => ({ ...prev, to_wallet: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={contributionSubmitting || targetWallets.length === 0}
                  >
                    {targetWallets.map(wallet => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} - {formatCOP(wallet.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Monto</label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={contributionForm.amount}
                    onFocus={() => {
                      if (contributionForm.amount === '0') {
                        setContributionForm(prev => ({ ...prev, amount: '' }))
                      }
                    }}
                    onChange={(e) => {
                      const nextValue = e.target.value
                      if (nextValue === '') {
                        setContributionForm(prev => ({ ...prev, amount: '' }))
                        return
                      }
                      if (/^[\d.,\s]+$/.test(nextValue)) {
                        setContributionForm(prev => ({ ...prev, amount: nextValue }))
                      }
                    }}
                    onBlur={() => {
                      const normalized = String(normalizeCOPAmount(contributionForm.amount))
                      setContributionForm(prev => ({ ...prev, amount: normalized }))
                    }}
                    disabled={contributionSubmitting}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {QUICK_AMOUNT_STEPS.map((quickAmount) => (
                      <Button
                        key={`contrib-add-${quickAmount}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyContributionAmountDelta(quickAmount)}
                      >
                        + {formatCOP(quickAmount)}
                      </Button>
                    ))}
                    {QUICK_AMOUNT_STEPS.map((quickAmount) => (
                      <Button
                        key={`contrib-sub-${quickAmount}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyContributionAmountDelta(-quickAmount)}
                      >
                        - {formatCOP(quickAmount)}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Vista previa: <span className="font-semibold text-foreground">{formatCOP(normalizeCOPAmount(contributionForm.amount))}</span>
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Nota (opcional)</label>
                  <Input
                    type="text"
                    placeholder="Aporte mensual"
                    value={contributionForm.note}
                    onChange={(e) => setContributionForm(prev => ({ ...prev, note: e.target.value }))}
                    disabled={contributionSubmitting}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeContributionModal}>
                    Cerrar
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={contributionSubmitting || sourceWallets.length === 0 || targetWallets.length === 0}
                  >
                    {contributionSubmitting ? 'Procesando...' : 'Aportar'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {accounts.map((account, index) => {
          const visual = CARD_VISUALS[index % CARD_VISUALS.length]
          const Icon = visual.icon
          const isPrimary = account.owner_id === user?.id
          const isShared = isSharedAccount(account)
          const ownerLabel = isPrimary ? currentUserLabel : 'Propietario'

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
                    {isPrimary && (
                      <span className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-bold tracking-[0.14em] text-primary">
                        PRIMARY
                      </span>
                    )}
                    <span className={`rounded-lg px-3 py-1 text-xs font-bold tracking-[0.12em] ${isShared ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {isShared ? 'SHARED' : 'PERSONAL'}
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">Owner: {ownerLabel}</p>
                <p className="mt-1 text-sm italic text-muted-foreground">Created: {formatDate(account.created_at)}</p>

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

                    {isShared && (
                      <button
                        type="button"
                        onClick={() => openContributionModal(account)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Aportar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleEdit(account)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </button>
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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Historial de aportes entre cuentas</h2>
            <p className="text-sm text-muted-foreground">Consulta transferencias entre cuentas personales y compartidas.</p>
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

        <div className="flex items-center gap-6 text-sm font-semibold text-muted-foreground">
          <button type="button" className="hover:text-foreground">Privacy Policy</button>
          <button type="button" className="hover:text-foreground">Terms of Service</button>
        </div>
      </div>
    </div>
  )
}
