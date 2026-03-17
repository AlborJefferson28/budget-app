import { useEffect, useState } from 'react'
import { AlertTriangle, KeyRound, Save, ShieldAlert, UserRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { profilesService } from '../services'
import { supabase } from '../supabaseClient'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

const DELETE_CONFIRM_TEXT = 'ELIMINAR'

const getErrorMessage = (error, fallback) => {
  if (!error) return fallback
  return error.message || fallback
}

export default function ProfileSettings() {
  const { user, signOut } = useAuth()
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileNotice, setProfileNotice] = useState('')

  const [name, setName] = useState('')

  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')

  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      if (!user?.id) {
        if (isMounted) setProfileLoading(false)
        return
      }

      setProfileLoading(true)
      setProfileError('')

      const { data, error } = await profilesService.get(user.id)

      if (!isMounted) return

      if (error && error.code !== 'PGRST116') {
        setProfileError(getErrorMessage(error, 'No fue posible cargar el perfil.'))
      } else {
        setName(data?.name || user?.user_metadata?.full_name || '')
      }

      setProfileLoading(false)
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [user])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!user?.id) return

    setProfileSaving(true)
    setProfileError('')
    setProfileNotice('')

    const nextName = name.trim()
    const { error: profileUpdateError } = await profilesService.upsert({ id: user.id, name: nextName })

    if (profileUpdateError) {
      setProfileError(getErrorMessage(profileUpdateError, 'No se pudo actualizar el perfil.'))
      setProfileSaving(false)
      return
    }

    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        full_name: nextName,
      },
    })

    if (metadataError) {
      setProfileError(getErrorMessage(metadataError, 'El perfil se guardó parcialmente.'))
    } else {
      setProfileNotice('Perfil actualizado correctamente.')
    }

    setProfileSaving(false)
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()

    setPasswordError('')
    setPasswordNotice('')

    if (passwordForm.password.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordError('La confirmación de contraseña no coincide.')
      return
    }

    setPasswordSaving(true)

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.password,
    })

    if (error) {
      setPasswordError(getErrorMessage(error, 'No se pudo actualizar la contraseña.'))
    } else {
      setPasswordForm({ password: '', confirmPassword: '' })
      setPasswordNotice('Contraseña actualizada correctamente.')
    }

    setPasswordSaving(false)
  }

  const handleDeleteAccount = async () => {
    setDeleteError('')

    if (deleteConfirmation.trim().toUpperCase() !== DELETE_CONFIRM_TEXT) {
      setDeleteError(`Escribe "${DELETE_CONFIRM_TEXT}" para confirmar.`)
      return
    }

    setDeletingAccount(true)

    const { error } = await supabase.rpc('delete_my_account')

    if (error) {
      if (error.code === 'PGRST202') {
        setDeleteError('Falta la función RPC delete_my_account en Supabase.')
      } else {
        setDeleteError(getErrorMessage(error, 'No se pudo eliminar la cuenta de usuario.'))
      }
      setDeletingAccount(false)
      return
    }

    await signOut()
    setDeletingAccount(false)
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <UserRound className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Perfil de usuario</h1>
            <p className="text-sm text-slate-500">Actualiza tu información básica.</p>
          </div>
        </div>

        {profileError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {profileError}
          </div>
        )}

        {profileNotice && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {profileNotice}
          </div>
        )}

        {profileLoading ? (
          <p className="text-sm text-slate-500">Cargando perfil...</p>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Email</label>
              <Input value={user?.email || ''} disabled />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Nombre visible</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                disabled={profileSaving}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="h-10 bg-[#1f5fe8] text-sm font-semibold hover:bg-[#1852cd]" disabled={profileSaving}>
                <Save className="mr-2 h-4 w-4" />
                {profileSaving ? 'Guardando...' : 'Guardar perfil'}
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Configuración de seguridad</h2>
            <p className="text-sm text-slate-500">Cambia tu contraseña.</p>
          </div>
        </div>

        {passwordError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {passwordError}
          </div>
        )}

        {passwordNotice && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {passwordNotice}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Nueva contraseña</label>
            <Input
              type="password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Mínimo 8 caracteres"
              disabled={passwordSaving}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Confirmar contraseña</label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Repite la contraseña"
              disabled={passwordSaving}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="h-10 bg-[#1f5fe8] text-sm font-semibold hover:bg-[#1852cd]" disabled={passwordSaving}>
              {passwordSaving ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50/40 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-red-900">Zona de peligro</h2>
            <p className="text-sm text-red-700">Esta acción elimina únicamente tu cuenta de usuario.</p>
          </div>
        </div>

        <div className="mb-4 rounded-md border border-red-200 bg-white px-3 py-3 text-sm text-red-700">
          <p className="font-medium">Se eliminará tu acceso de autenticación y no podrás iniciar sesión nuevamente con este usuario.</p>
          <p className="mt-1">Para continuar, escribe <span className="font-semibold">{DELETE_CONFIRM_TEXT}</span>.</p>
        </div>

        {deleteError && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-800">
            {deleteError}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder={`Escribe ${DELETE_CONFIRM_TEXT}`}
            disabled={deletingAccount}
          />
          <Button
            type="button"
            variant="destructive"
            className="h-10 text-sm font-semibold"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            {deletingAccount ? 'Eliminando...' : 'Eliminar mi cuenta'}
          </Button>
        </div>
      </section>
    </div>
  )
}
