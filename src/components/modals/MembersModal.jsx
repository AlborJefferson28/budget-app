import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectEmpty } from '../ui/Select';
import { 
  Plus, Trash2, ShieldCheck, User, UserPlus, QrCode, Copy 
} from 'lucide-react';
import { accountMembersService, usersService } from '../../services';

const MEMBER_ROLE_OPTIONS = [
  { value: 'member', label: 'Miembro', icon: User },
  { value: 'admin', label: 'Admin', icon: ShieldCheck },
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const formatDate = (date) => {
  if (!date) return 'Sin fecha';
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(parsedDate);
};

export default function MembersModal({ 
  open, 
  onClose, 
  account, 
  currentUser,
  onAccountUpdate, // Passed from parent hook
  onNotifyChanges // Passed from parent hook
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [memberForm, setMemberForm] = useState({ identifier: '', role: 'member' });
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const isOwner = account?.owner_id === currentUser?.id;

  useEffect(() => {
    if (open && account) {
      loadMembers();
      setMemberForm({ identifier: '', role: 'member' });
      setIdempotencyKey(crypto.randomUUID());
      setError('');
      setNotice('');
    }
  }, [open, account]);

  const loadMembers = async () => {
    if (!account?.id) return;
    setLoading(true);
    const { data, error: membersLoadError } = await accountMembersService.getByAccount(account.id);
    if (!membersLoadError) {
      setMembers(data || []);
    } else {
      setError('No se pudieron cargar los miembros.');
    }
    setLoading(false);
  };

  const resolveUserId = async (identifier) => {
    const value = identifier.trim();
    if (!value) return { userId: null, error: 'Ingresa un correo electrónico.' };
    if (UUID_REGEX.test(value)) return { userId: value, error: null };
    if (value.includes('@')) {
      const { data, error: userLookupError } = await usersService.getByEmail(value);
      if (userLookupError) return { userId: null, error: 'No se pudo encontrar al usuario.' };
      if (!data?.id) return { userId: null, error: 'No se encontró el usuario con ese correo.' };
      return { userId: data.id, error: null };
    }
    return { userId: null, error: 'Ingresa un correo electrónico válido.' };
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!account) return;
    if (!isOwner) {
      setError('Solo el propietario puede gestionar miembros.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');

    const { userId, error: resolveError } = await resolveUserId(memberForm.identifier);
    if (resolveError) {
      setError(resolveError);
      setBusy(false);
      return;
    }

    if (userId === account.owner_id) {
      setError('El propietario ya es parte de la cuenta.');
      setBusy(false);
      return;
    }

    if (members.some(member => member.user_id === userId)) {
      setError('Este usuario ya está en la cuenta.');
      setBusy(false);
      return;
    }

    const { error: addError } = await accountMembersService.addMember(account.id, userId, memberForm.role, idempotencyKey);

    if (addError) {
      setError(addError.message || 'No se pudo agregar al miembro.');
    } else {
      if (account.kind !== 'shared') {
        await onAccountUpdate(account.id, { kind: 'shared' });
      }
      setMemberForm({ identifier: '', role: 'member' });
      setIdempotencyKey(crypto.randomUUID());
      setNotice('Miembro agregado correctamente.');
      await loadMembers();
      onNotifyChanges?.();
    }
    setBusy(false);
  };

  const handleUpdateRole = async (member, role) => {
    if (!account || !isOwner || role === member.role) return;
    if (member.user_id === currentUser?.id) {
      setError('No puedes cambiar tu propio rol.');
      return;
    }

    setBusy(true);
    const { error: roleError } = await accountMembersService.updateRole(account.id, member.user_id, role);
    if (!roleError) {
      setMembers(prev => prev.map(m => m.user_id === member.user_id ? { ...m, role } : m));
      setNotice('Rol actualizado.');
    } else {
      setError('No se pudo actualizar el rol.');
    }
    setBusy(false);
  };

  const handleRemoveMember = async (member) => {
    if (!account || !isOwner) return;
    if (member.user_id === currentUser?.id) return;

    const displayName = member.profiles?.[0]?.name || member.profiles?.name || 'Miembro';
    if (!window.confirm(`¿Eliminar a ${displayName} de esta cuenta?`)) return;

    setBusy(true);
    const { error: removeError } = await accountMembersService.removeMember(account.id, member.user_id);
    if (!removeError) {
      setMembers(prev => prev.filter(m => m.user_id !== member.user_id));
      setNotice('Miembro eliminado.');
      onNotifyChanges?.();
    } else {
      setError('No se pudo eliminar al miembro.');
    }
    setBusy(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg p-5 sm:p-8 w-full max-w-3xl relative max-h-[88vh] overflow-y-auto border border-border">
        <h3 className="text-xl font-bold mb-1">Gestionar miembros</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Cuenta: <span className="font-semibold text-foreground">{account?.name}</span>
        </p>

        {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        {notice && <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{notice}</div>}

        <div className="mb-4 rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Propietario</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="font-semibold text-foreground">
              {account?.owner_id === currentUser?.id ? 'Tú' : 'Propietario de la cuenta'}
            </p>
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-foreground capitalize">dueño</span>
          </div>
        </div>

        {isOwner ? (
          <form onSubmit={handleAddMember} className="mb-6 rounded-lg border border-border p-4">
            <p className="mb-3 text-sm font-medium text-foreground">Agregar miembro</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_auto] md:items-end">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Correo del usuario</label>
                <Input
                  type="text"
                  placeholder="usuario@email.com"
                  value={memberForm.identifier}
                  onChange={(e) => setMemberForm(prev => ({ ...prev, identifier: e.target.value }))}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Rol</label>
                <Select
                  value={memberForm.role}
                  onValueChange={(value) => setMemberForm(prev => ({ ...prev, role: value }))}
                  disabled={busy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBER_ROLE_OPTIONS.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <role.icon className="h-4 w-4 text-muted-foreground" />
                          <span>{role.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={busy || !memberForm.identifier.trim()} className="h-10">
                {busy ? 'Agregando...' : 'Agregar'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mb-6 rounded-md border border-secondary bg-secondary/40 px-3 py-2 text-sm text-secondary-foreground">
            Solo el propietario puede gestionar miembros.
          </div>
        )}

        {/* Members List Section */}
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Miembros actuales</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando miembros...</p>
          ) : members.filter(m => m.user_id !== account?.owner_id).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay otros miembros.</p>
          ) : (
            <div className="space-y-3">
              {members.filter(m => m.user_id !== account?.owner_id).map(member => {
                const displayName = member.profiles?.[0]?.name || member.profiles?.name || 'Miembro';
                const isCurrent = member.user_id === currentUser?.id;
                return (
                  <div key={member.user_id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{displayName} {isCurrent ? '(Tú)' : ''}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Agregado: {formatDate(member.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          disabled={!isOwner || busy || isCurrent}
                          onValueChange={(value) => handleUpdateRole(member, value)}
                        >
                          <SelectTrigger className="h-9 min-w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEMBER_ROLE_OPTIONS.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isOwner && !isCurrent && (
                          <Button variant="outline" size="sm" onClick={() => handleRemoveMember(member)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
}
