import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatCOP, formatCOPInput, formatCOPInputFromRaw, normalizeCOPAmount } from '../../lib/currency';
import { accountTransfersService, walletsService } from '../../services';
import { AmountInput } from '../ui/AmountInput';

export default function ContributionModal({ 
  open, 
  onClose, 
  targetAccount, 
  accounts, // All accounts for finding source wallets
  currentUser,
  onSuccess
}) {
  const [sourceWallets, setSourceWallets] = useState([]);
  const [targetWallets, setTargetWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    from_wallet: '',
    to_wallet: '',
    amount: '0',
    note: '',
  });
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    if (open && targetAccount) {
      loadWallets();
      setForm({ from_wallet: '', to_wallet: '', amount: '0', note: '' });
      setIdempotencyKey(crypto.randomUUID());
      setError('');
      setNotice('');
    }
  }, [open, targetAccount]);

  const loadWallets = async () => {
    if (!targetAccount) return;
    setLoading(true);
    setError('');

    try {
      // Find personal source accounts
      const personalAccounts = accounts.filter(acc => 
        acc.owner_id === currentUser?.id && 
        acc.id !== targetAccount.id && 
        acc.kind !== 'shared'
      );

      if (personalAccounts.length === 0) {
        setError('Debes tener al menos una cuenta personal con fondos.');
        setLoading(false);
        return;
      }

      // Load source wallets
      const sourceWalletResponses = await Promise.all(
        personalAccounts.map(async (acc) => {
          const { data } = await walletsService.getByAccount(acc.id);
          return (data || []).map(w => ({ ...w, account_name: acc.name }));
        })
      );
      const sourceOptions = sourceWalletResponses.flat();

      // Load target (shared) wallets
      const { data: destWallets, error: destError } = await walletsService.getByAccount(targetAccount.id);
      if (destError) throw destError;

      const targetOptions = destWallets || [];

      if (sourceOptions.length === 0) setError('No se encontraron billeteras en tus cuentas personales.');
      else if (targetOptions.length === 0) setError('La cuenta compartida no tiene billeteras de destino.');

      setSourceWallets(sourceOptions);
      setTargetWallets(targetOptions);
      setForm(prev => ({
        ...prev,
        from_wallet: sourceOptions[0]?.id || '',
        to_wallet: targetOptions[0]?.id || '',
      }));
    } catch (err) {
      setError('Error al cargar billeteras.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = normalizeCOPAmount(form.amount);
    if (amount <= 0) return setError('Ingresa un monto válido.');

    setSubmitting(true);
    const { error: transferError } = await accountTransfersService.contributeToSharedAccount({
      fromWalletId: form.from_wallet,
      toWalletId: form.to_wallet,
      amount,
      note: form.note.trim(),
      idempotencyKey: idempotencyKey,
    });

    if (transferError) {
      setError(transferError.code === '23505' ? 'Este aporte ya fue registrado.' : 'No se pudo procesar el aporte.');
      setSubmitting(false);
    } else {
      setNotice('Aporte registrado correctamente.');
      onSuccess?.();
      setTimeout(onClose, 1000);
    }
  };



  const currentSourceWallet = useMemo(() => 
    sourceWallets.find(w => w.id === form.from_wallet), 
    [sourceWallets, form.from_wallet]
  );
  const previewAmount = useMemo(() => normalizeCOPAmount(form.amount), [form.amount]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg p-5 sm:p-8 w-full max-w-2xl relative max-h-[88vh] overflow-y-auto border border-border">
        <h3 className="text-xl font-bold mb-1">Aportar a cuenta compartida</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Cuenta destino: <span className="font-semibold text-foreground">{targetAccount?.name}</span>
        </p>

        {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        {notice && <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{notice}</div>}

        {loading ? (
          <p className="text-sm text-muted-foreground p-4 text-center">Cargando opciones...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Desde mi billetera personal</label>
              <select
                value={form.from_wallet}
                onChange={(e) => setForm(prev => ({ ...prev, from_wallet: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                disabled={submitting || sourceWallets.length === 0}
              >
                {sourceWallets.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.account_name}) - {formatCOP(w.balance)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Hacia billetera compartida</label>
              <select
                value={form.to_wallet}
                onChange={(e) => setForm(prev => ({ ...prev, to_wallet: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                disabled={submitting || targetWallets.length === 0}
              >
                {targetWallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Monto</label>
              <AmountInput
                type="text"
                numeric
                value={form.amount}
                onFocus={() => form.amount === '0' && setForm(p => ({ ...p, amount: '' }))}
                onChange={e => setForm(p => ({ ...p, amount: formatCOPInputFromRaw(e.target.value) }))}
                onBlur={() => setForm(p => ({ ...p, amount: formatCOPInput(form.amount) }))}
                onStep={val => setForm(p => ({ ...p, amount: formatCOPInput(val) }))}
                disabled={submitting}
              />
              {currentSourceWallet && previewAmount > normalizeCOPAmount(currentSourceWallet.balance) && (
                <p className="mt-2 text-xs text-destructive font-medium">Saldo insuficiente en origen ({formatCOP(currentSourceWallet.balance)})</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Nota (opcional)</label>
              <Input type="text" placeholder="Ej: Aporte mensual" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} disabled={submitting} />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
              <Button type="submit" disabled={submitting || sourceWallets.length === 0 || targetWallets.length === 0 || previewAmount <= 0}>
                {submitting ? 'Procesando...' : 'Realizar aporte'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
