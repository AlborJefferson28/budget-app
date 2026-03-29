import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Trash2 } from 'lucide-react';

export default function AccountModal({ 
  open, 
  onClose, 
  editingAccount = null, 
  onSuccess,
  onCreateAccount, // Passed from hook/parent
  onUpdateAccount, // Passed from hook/parent
  onDeleteAccount  // Passed from hook/parent
}) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    if (open) {
      if (editingAccount) {
        setName(editingAccount.name);
      } else {
        setName('');
        setIdempotencyKey(crypto.randomUUID());
      }
    }
  }, [open, editingAccount]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSubmitting(true);
    try {
      if (editingAccount) {
        await onUpdateAccount(editingAccount.id, { name: trimmedName });
      } else {
        const { error } = await onCreateAccount({ 
          name: trimmedName, 
          idempotency_key: idempotencyKey 
        });
        if (error) {
          if (error.code === '23505') {
            alert('Esta cuenta ya ha sido registrada (duplicado detectado).');
          } else {
            alert(error.message || 'No fue posible crear la cuenta.');
          }
          setSubmitting(false);
          return;
        }
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error saving account:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (editingAccount && window.confirm('¿Estás seguro de eliminar esta cuenta?')) {
      setSubmitting(true);
      try {
        await onDeleteAccount(editingAccount.id);
        onSuccess?.();
        onClose();
      } catch (err) {
        console.error('Error deleting account:', err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto border border-border">
        <h3 className="text-xl font-bold mb-4">{editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
        <div className="mb-5">
          <label className="block text-sm mb-1">Nombre</label>
          <Input
            type="text"
            placeholder="Nombre de la cuenta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="flex gap-2 justify-end">
          {editingAccount && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={submitting}
              className="mr-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? 'Procesando...' : (editingAccount ? 'Actualizar' : 'Crear')}
          </Button>
        </div>
      </form>
    </div>
  );
}
