import { useState, useEffect } from 'react';
import { useWallets } from '../../hooks/useWallets';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatCOP, formatCOPInput, formatCOPInputFromRaw, normalizeCOPAmount } from '../../lib/currency';
import { normalizeIconKey } from '../../lib/icons';
import { AmountInput } from '../ui/AmountInput';
import { IconPicker } from '../ui/IconPicker';
import { Trash2 } from 'lucide-react';

export default function WalletModal({ open, onClose, accountId, editingWallet = null, onSuccess }) {
  const { createWallet, updateWallet, deleteWallet } = useWallets(accountId);
  const [formData, setFormData] = useState({ name: '', icon: 'wallet', balance: 0 });
  const [balanceInput, setBalanceInput] = useState('0');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    if (open) {
      if (editingWallet) {
        setFormData({
          name: editingWallet.name,
          icon: normalizeIconKey(editingWallet.icon, 'wallet'),
          balance: editingWallet.balance
        });
        setBalanceInput(formatCOPInput(editingWallet.balance));
      } else {
        setFormData({ name: '', icon: 'wallet', balance: 0 });
        setBalanceInput('0');
        setIdempotencyKey(crypto.randomUUID());
      }
      setFormError('');
    }
  }, [open, editingWallet]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const normalizedBalance = normalizeCOPAmount(balanceInput);

    const dataToSubmit = {
      name: formData.name.trim(),
      icon: normalizeIconKey(formData.icon, 'wallet'),
      balance: normalizedBalance
    };

    if (!dataToSubmit.name) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    setSubmitting(true);
    let result;
    if (editingWallet) {
      result = await updateWallet(editingWallet.id, dataToSubmit);
    } else {
      result = await createWallet({ ...dataToSubmit, idempotency_key: idempotencyKey });
    }
    setSubmitting(false);

    if (result?.error) {
      if (result.error.code === '23505') {
        setFormError('Esta billetera ya existe (duplicado).');
      } else {
        setFormError(result.error.message || 'Error al procesar la billetera.');
      }
      return;
    }

    onSuccess?.();
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de eliminar esta billetera?')) {
      await deleteWallet(editingWallet.id);
      onSuccess?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <h3 className="text-xl font-bold mb-4">{editingWallet ? 'Editar Billetera' : 'Nueva Billetera'}</h3>
        
        {formError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <Input
              type="text"
              placeholder="Ej: Efectivo, Cuenta Ahorros"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Balance inicial (COP)</label>
            <AmountInput
              type="text"
              numeric
              placeholder="0"
              value={balanceInput}
              onFocus={() => balanceInput === '0' && setBalanceInput('')}
              onChange={(e) => setBalanceInput(formatCOPInputFromRaw(e.target.value))}
              onBlur={() => setBalanceInput(formatCOPInput(balanceInput))}
              onStep={(val) => setBalanceInput(formatCOPInput(val))}
            />
          </div>

          <IconPicker
            type="wallet"
            value={formData.icon}
            onChange={(icon) => setFormData({ ...formData, icon })}
          />
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-2 sm:justify-end">
          {editingWallet && (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto mr-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          )}
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
            {submitting ? 'Procesando...' : (editingWallet ? 'Actualizar' : 'Crear')}
          </Button>
        </div>
      </form>
    </div>
  );
}
