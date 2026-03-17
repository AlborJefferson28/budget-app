import { useMemo, useState } from 'react'
import { BriefcaseBusiness, CirclePlus, Info, Pencil, PiggyBank, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { useAccounts } from '../hooks/useAccounts'
import { useAuth } from '../contexts/AuthContext'
import { accountMembersService, usersService } from '../services'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

const CARD_VISUALS = [
  { icon: PiggyBank, container: 'bg-[#dfe8fb] text-[#7c99dc]' },
  { icon: Users, container: 'bg-[#e4e8f7] text-[#8aa1e7]' },
  { icon: BriefcaseBusiness, container: 'bg-[#e8edf3] text-[#8ea2bb]' },
]

const MEMBER_ROLES = ['member', 'admin']
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const formatDate = (date) => {
  if (!date) return 'Unknown'
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
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

  const currentUserLabel = useMemo(() => {
    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name
    if (fullName) return fullName
    if (user?.email) return user.email.split('@')[0]
    return 'You'
  }, [user])

  const isOwnerOfMembersAccount = membersAccount?.owner_id === user?.id

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
      setMemberForm({ identifier: '', role: 'member' })
      setMembersNotice('Member added successfully.')
      await loadMembers(membersAccount.id)
    }

    setMembersBusy(false)
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
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-base text-gray-500">Loading accounts...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-base text-red-600">Error: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-0 pb-8 sm:px-2">
      <section className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your Accounts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose an account to manage your finances or create a new one.
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          className="h-11 w-full rounded-2xl bg-[#1f5fe8] px-6 text-sm font-semibold shadow-lg shadow-blue-500/25 hover:bg-[#1852cd] lg:w-auto"
        >
          <CirclePlus className="mr-2 h-5 w-5" />
          Create New Account
        </Button>
      </section>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
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
                  className="mr-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
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
          <div className="bg-white rounded-lg shadow-lg p-5 sm:p-8 w-full max-w-3xl relative max-h-[88vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-1">Manage Members</h3>
            <p className="text-sm text-gray-600 mb-4">
              Account: <span className="font-semibold text-gray-900">{membersAccount.name}</span>
            </p>

            {membersError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {membersError}
              </div>
            )}

            {membersNotice && (
              <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {membersNotice}
              </div>
            )}

            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">
                  {membersAccount.owner_id === user?.id ? `${currentUserLabel} (You)` : shortId(membersAccount.owner_id)}
                </p>
                <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">owner</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{membersAccount.owner_id}</p>
            </div>

            {isOwnerOfMembersAccount ? (
              <form onSubmit={handleAddMember} className="mb-6 rounded-lg border border-slate-200 p-4">
                <p className="mb-3 text-sm font-medium text-slate-700">Add Member</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_auto] md:items-end">
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Email or User UUID</label>
                    <Input
                      type="text"
                      placeholder="member@email.com or UUID"
                      value={memberForm.identifier}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, identifier: e.target.value }))}
                      disabled={membersBusy}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-slate-600">Role</label>
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
                    {membersBusy ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                You can view members, but only the account owner can modify them.
              </div>
            )}

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-700">Current Members</p>

              {membersLoading ? (
                <p className="text-sm text-slate-500">Loading members...</p>
              ) : members.length === 0 ? (
                <p className="text-sm text-slate-500">No members added yet.</p>
              ) : (
                <div className="space-y-3">
                  {members.map(member => {
                    const displayName = getProfileName(member.profiles) || shortId(member.user_id)
                    const isCurrentUser = member.user_id === user?.id

                    return (
                      <div key={member.user_id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {displayName} {isCurrentUser ? '(You)' : ''}
                            </p>
                            <p className="text-xs text-slate-500">{member.user_id}</p>
                            <p className="mt-1 text-xs text-slate-400">Added: {formatDate(member.created_at)}</p>
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
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
                              >
                                Remove
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
              <Button type="button" variant="outline" onClick={closeMembersModal}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {accounts.map((account, index) => {
          const visual = CARD_VISUALS[index % CARD_VISUALS.length]
          const Icon = visual.icon
          const isPrimary = account.owner_id === user?.id
          const ownerLabel = isPrimary ? currentUserLabel : 'Shared Account'

          return (
            <article
              key={account.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]"
            >
              <div className={`flex h-40 items-center justify-center ${visual.container}`}>
                <Icon className="h-14 w-14" strokeWidth={1.8} />
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="break-words text-xl font-bold text-slate-900">{account.name}</h3>
                  {isPrimary && (
                    <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold tracking-[0.14em] text-emerald-700">
                      PRIMARY
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-slate-600">Owner: {ownerLabel}</p>
                <p className="mt-1 text-sm italic text-slate-400">Created: {formatDate(account.created_at)}</p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openMembersModal(account)}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f5fe8] transition-colors hover:text-[#184ac0]"
                    >
                      <UserPlus className="h-5 w-5" />
                      Manage Members
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEdit(account)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedAccount(account.id)
                      setPage('wallets')
                    }}
                    className="h-10 min-w-[120px] rounded-xl bg-[#1f5fe8] text-sm font-semibold hover:bg-[#1852cd]"
                  >
                    Open
                  </Button>
                </div>
              </div>
            </article>
          )
        })}

        <button
          type="button"
          onClick={openCreateForm}
          className="flex min-h-[240px] sm:min-h-[356px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 px-6 sm:px-10 text-center transition-colors hover:border-[#98afe8] hover:bg-white"
        >
          <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Plus className="h-10 w-10" />
          </span>
          <h3 className="text-xl font-bold text-slate-900">Add Another Account</h3>
          <p className="mt-2 text-sm text-slate-500">Easily track multiple funds separately</p>
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-slate-600">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Info className="h-4 w-4" />
          </span>
          <p className="text-sm leading-relaxed">
            Need help setting up a business account?
            <button type="button" className="ml-1 font-semibold text-[#1f5fe8] hover:text-[#184ac0]">
              Contact Support
            </button>
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm font-semibold text-slate-500">
          <button type="button" className="hover:text-slate-700">Privacy Policy</button>
          <button type="button" className="hover:text-slate-700">Terms of Service</button>
        </div>
      </div>
    </div>
  )
}
