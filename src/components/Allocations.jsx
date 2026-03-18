
import { useState, useMemo, useEffect } from 'react';
import { useAllocations } from '../hooks/useAllocations';
import { useWallets } from '../hooks/useWallets';
import { useBudgets } from '../hooks/useBudgets';
import { useAccounts } from '../hooks/useAccounts';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/Select';
import { formatCOP, parseCOP } from '../lib/currency';
import { accountTransfersService, walletsService } from '../services';

const QUICK_AMOUNT_STEPS = [10000, 50000, 100000];

const normalizeCOPAmount = (value) => {
  const parsed = parseCOP(value);
  return Math.max(0, Math.round(parsed));
};

const STATUS = {
  completed: { label: 'Completada', color: 'bg-green-100 text-green-700' },
  processing: { label: 'En proceso', color: 'bg-blue-100 text-blue-700' },
};

const getAllocationType = (amount, average) => {
  if (!average || average <= 0) {
    return { label: 'Media', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }

  if (amount >= average) {
    return { label: 'Mas', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  }

  return { label: 'Menos', color: 'bg-amber-100 text-amber-700 border-amber-200' };
};

function getStatus(idx) {
  // Demo: alternar entre completado y processing
  return idx % 3 === 2 ? 'processing' : 'completed';
}

export default function Allocations({ accountId, setPage }) {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { allocations, loading, error, createAllocation, updateAllocation, deleteAllocation } = useAllocations(accountId);
  const { wallets } = useWallets(accountId);
  const { budgets } = useBudgets(accountId);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ wallet_id: '', budget_id: '', amount: 0, funding_wallet_id: '' });
  const [amountInput, setAmountInput] = useState('0');
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPageNum] = useState(1);
  const [personalFundingWallets, setPersonalFundingWallets] = useState([]);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const pageSize = 4;

  const activeAccount = useMemo(
    () => accounts.find(account => account.id === accountId) || null,
    [accounts, accountId]
  );
  const isSharedContext = activeAccount?.kind === 'shared' || activeAccount?.owner_id !== user?.id;

  useEffect(() => {
    if (!showForm || editing) return;

    setFormData(prev => ({
      ...prev,
      wallet_id: prev.wallet_id || wallets[0]?.id || '',
      budget_id: prev.budget_id || budgets[0]?.id || '',
    }));
  }, [showForm, editing, wallets, budgets]);

  useEffect(() => {
    if (!showForm) return;

    const loadPersonalFundingWallets = async () => {
      if (!isSharedContext) {
        setPersonalFundingWallets([]);
        setFundingLoading(false);
        return;
      }

      const personalAccounts = accounts.filter(account =>
        account.owner_id === user?.id &&
        account.id !== accountId &&
        account.kind !== 'shared'
      );

      if (personalAccounts.length === 0) {
        setPersonalFundingWallets([]);
        setFundingLoading(false);
        return;
      }

      setFundingLoading(true);
      const responses = await Promise.all(
        personalAccounts.map(async (account) => {
          const { data, error: walletError } = await walletsService.getByAccount(account.id);
          return { account, data, error: walletError };
        })
      );

      const firstError = responses.find(item => item.error)?.error;
      if (firstError) {
        setFormError(firstError.message || 'No se pudieron cargar wallets personales.');
        setPersonalFundingWallets([]);
        setFundingLoading(false);
        return;
      }

      const options = responses.flatMap(({ account, data }) =>
        (data || []).map(wallet => ({
          ...wallet,
          account_name: account.name,
        }))
      );

      setPersonalFundingWallets(options);
      setFundingLoading(false);
    };

    loadPersonalFundingWallets();
  }, [showForm, isSharedContext, accounts, user?.id, accountId]);

  // Filtros y paginación
  const filtered = useMemo(() => {
    if (!search) return allocations;
    return allocations.filter(a => {
      const wallet = a.wallets?.name?.toLowerCase() || '';
      const budget = a.budgets?.name?.toLowerCase() || '';
      return wallet.includes(search.toLowerCase()) || budget.includes(search.toLowerCase());
    });
  }, [allocations, search]);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Resúmenes con valores más dinámicos y actuales
  const totalAllocated = useMemo(() => allocations.reduce((sum, a) => sum + (a.amount || 0), 0), [allocations]);
  const totalWalletBalance = useMemo(() => wallets.reduce((sum, w) => sum + (w.balance || 0), 0), [wallets]);
  const allocationPercentage = useMemo(() => totalWalletBalance > 0 ? (totalAllocated / totalWalletBalance) * 100 : 0, [totalAllocated, totalWalletBalance]);

  const mostActiveWallet = useMemo(() => {
    if (allocations.length === 0) return { name: '-', count: 0 };
    const walletCount = {};
    allocations.forEach(a => {
      if (a.wallets?.name) walletCount[a.wallets.name] = (walletCount[a.wallets.name] || 0) + 1;
    });
    const [name, allocationCount] = Object.entries(walletCount).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
    return { name, count: allocationCount };
  }, [allocations]);

  const budgetCoverage = useMemo(() => {
    if (budgets.length === 0) return 0;
    const uniqueBudgets = new Set(allocations.map(a => a.budget_id).filter(id => id));
    return Math.round((uniqueBudgets.size / budgets.length) * 100);
  }, [allocations, budgets]);

  const averageAllocation = useMemo(() => {
    return allocations.length > 0 ? totalAllocated / allocations.length : 0;
  }, [totalAllocated, allocations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const amount = normalizeCOPAmount(amountInput);
    if (amount <= 0) {
      setFormError('Ingresa un monto válido mayor a 0.');
      return;
    }

    if (editing) {
      await updateAllocation(editing.id, {
        wallet_id: formData.wallet_id,
        budget_id: formData.budget_id,
        amount,
      });
      setEditing(null);
    } else {
      if (!formData.wallet_id || !formData.budget_id) {
        setFormError('Selecciona wallet y presupuesto.');
        return;
      }

      if (formData.funding_wallet_id) {
        const selectedBudget = budgets.find(budget => budget.id === formData.budget_id);
        const { error: contributionError } = await accountTransfersService.contributeToSharedAccount({
          fromWalletId: formData.funding_wallet_id,
          toWalletId: formData.wallet_id,
          amount,
          note: `Funding allocation for ${selectedBudget?.name || 'budget'}`,
        });

        if (contributionError) {
          setFormError(contributionError.message || 'No fue posible aportar desde la wallet personal.');
          return;
        }
      }

      await createAllocation({
        wallet_id: formData.wallet_id,
        budget_id: formData.budget_id,
        amount,
      });
    }
    setFormData({ wallet_id: '', budget_id: '', amount: 0, funding_wallet_id: '' });
    setAmountInput('0');
    setShowForm(false);
  };

  const applyAmountQuickDelta = (delta) => {
    const nextValue = Math.max(0, normalizeCOPAmount(amountInput) + delta);
    setAmountInput(String(nextValue));
  };

  const handleEdit = (allocation) => {
    setEditing(allocation);
    setFormData({
      wallet_id: allocation.wallet_id,
      budget_id: allocation.budget_id,
      amount: allocation.amount,
      funding_wallet_id: '',
    });
    setAmountInput(String(normalizeCOPAmount(allocation.amount)));
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta asignación?')) {
      await deleteAllocation(id);
    }
  };

  const openCreateForm = () => {
    setEditing(null);
    setFormError('');
    setAmountInput('0');
    setFormData({ wallet_id: '', budget_id: '', amount: 0, funding_wallet_id: '' });
    setShowForm(true);
  };

  if (loading) return <div className="p-8">Cargando...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Asignaciones</h1>
          <p className="text-muted-foreground text-sm">Distribuye fondos entre tus categorías de presupuesto.</p>
        </div>
        <Button onClick={openCreateForm} className="h-10 px-6 text-base font-semibold shadow w-full sm:w-auto">
          + Nueva asignación
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Buscar asignaciones, billeteras..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPageNum(1); }}
          className="max-w-md w-full"
        />
      </div>

      {/* Tabla de asignaciones */}
      <Card className="mb-8">
        <CardContent className="p-0">
          <div className="md:hidden p-4 space-y-3">
            {paged.map((allocation, idx) => (
              <div key={allocation.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">BILLETERA ORIGEN</p>
                    <div className="mt-1 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5">
                      <span className="text-lg">{allocation.wallets?.icon || '💰'}</span>
                      <p className="font-semibold text-blue-900">{allocation.wallets?.name || 'Sin nombre'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${STATUS[getStatus(idx)].color}`}>{STATUS[getStatus(idx)].label}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">PRESUPUESTO DESTINO</p>
                  <div className="mt-1 inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1.5">
                    <span className="text-lg">{allocation.budgets?.icon || '🏷️'}</span>
                    <p className="font-semibold text-teal-900">{allocation.budgets?.name || 'Sin nombre'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">MONTO</p>
                    <p className="font-bold text-blue-700">{formatCOP(allocation.amount)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{allocation.created_at ? new Date(allocation.created_at).toLocaleDateString() : ''}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${getAllocationType(allocation.amount, averageAllocation).color}`}>
                    {getAllocationType(allocation.amount, averageAllocation).label}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(allocation)} className="flex-1">Editar</Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(allocation.id)} className="flex-1">Eliminar</Button>
                </div>
              </div>
            ))}
            {paged.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No se encontraron asignaciones.</p>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-3 px-6 text-left font-semibold">BILLETERA ORIGEN</th>
                  <th className="py-3 px-6 text-left font-semibold">PRESUPUESTO DESTINO</th>
                  <th className="py-3 px-6 text-left font-semibold">MONTO</th>
                  <th className="py-3 px-6 text-left font-semibold">TIPO</th>
                  <th className="py-3 px-6 text-left font-semibold">FECHA</th>
                  <th className="py-3 px-6 text-left font-semibold">ESTADO</th>
                  <th className="py-3 px-6"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((allocation, idx) => (
                  <tr key={allocation.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                    <td className="py-3 px-6">
                      <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                        <span className="text-xl">{allocation.wallets?.icon || '💰'}</span>
                        <div>
                          <div className="font-semibold text-blue-900">{allocation.wallets?.name || 'Sin nombre'}</div>
                          <div className="text-xs text-blue-700/80">Cuenta origen</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
                        <span className="text-xl">{allocation.budgets?.icon || '🏷️'}</span>
                        <div>
                          <div className="font-semibold text-teal-900">{allocation.budgets?.name || 'Sin nombre'}</div>
                          <div className="text-xs text-teal-700/80">Presupuesto destino</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6 font-bold">{formatCOP(allocation.amount)}</td>
                    <td className="py-3 px-6">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getAllocationType(allocation.amount, averageAllocation).color}`}>
                        {getAllocationType(allocation.amount, averageAllocation).label}
                      </span>
                    </td>
                    <td className="py-3 px-6">{allocation.created_at ? new Date(allocation.created_at).toLocaleDateString() : ''}</td>
                    <td className="py-3 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS[getStatus(idx)].color}`}>{STATUS[getStatus(idx)].label}</span>
                    </td>
                    <td className="py-3 px-6 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(allocation)}>Editar</Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(allocation.id)}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No se encontraron asignaciones.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 text-xs text-muted-foreground border-t">
            <span>Mostrando {paged.length} de {filtered.length} asignaciones</span>
            <div className="flex gap-1 overflow-x-auto">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  className={`w-8 h-8 rounded flex items-center justify-center border ${page === i + 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                  onClick={() => setPageNum(i + 1)}
                >{i + 1}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resúmenes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <Card>
          <CardContent className="py-6">
            <div className="text-xs text-muted-foreground mb-1">Total asignado</div>
            <div className="text-2xl font-bold text-blue-700">{formatCOP(totalAllocated)}</div>
            <div className="text-xs text-muted-foreground mt-1">{allocationPercentage.toFixed(1)}% del balance total de billeteras</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="text-xs text-muted-foreground mb-1">Billetera más activa</div>
            <div className="text-xl font-bold">{mostActiveWallet.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{mostActiveWallet.count} asignaciones</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="text-xs text-muted-foreground mb-1">Cobertura de presupuestos</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{budgetCoverage}%</span>
            </div>
            <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${budgetCoverage}%` }} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{new Set(allocations.map(a => a.budget_id).filter(id => id)).size} / {budgets.length} presupuestos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="text-xs text-muted-foreground mb-1">Asignación promedio</div>
            <div className="text-2xl font-bold text-green-700">{formatCOP(averageAllocation)}</div>
            <div className="text-xs text-muted-foreground mt-1">Por asignación</div>
          </CardContent>
        </Card>
      </div>

      {/* Modal/Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editing ? 'Editar Asignación' : 'Nueva Asignación'}</h3>
            {formError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm mb-1">Billetera Origen</label>
              <Select value={formData.wallet_id} onValueChange={v => setFormData({ ...formData, wallet_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar billetera" /></SelectTrigger>
                <SelectContent>
                  {wallets.map(wallet => (
                    <SelectItem key={wallet.id} value={wallet.id}>{wallet.icon} {wallet.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!editing && isSharedContext && personalFundingWallets.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm mb-1">Aportar desde wallet personal (opcional)</label>
                <select
                  value={formData.funding_wallet_id}
                  onChange={e => setFormData({ ...formData, funding_wallet_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={fundingLoading}
                >
                  <option value="">No usar wallet personal</option>
                  {personalFundingWallets.map(wallet => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.icon || '💰'} {wallet.name} ({wallet.account_name}) - {formatCOP(wallet.balance)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Si seleccionas una wallet personal, primero se hará el aporte entre cuentas y luego la asignación al budget.
                </p>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm mb-1">Presupuesto Destino</label>
              <Select value={formData.budget_id} onValueChange={v => setFormData({ ...formData, budget_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar presupuesto" /></SelectTrigger>
                <SelectContent>
                  {budgets.map(budget => (
                    <SelectItem key={budget.id} value={budget.id}>{budget.icon} {budget.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mb-6">
              <label className="block text-sm mb-1">Monto</label>
              <Input
                type="text"
                placeholder="Monto"
                value={amountInput}
                onFocus={() => {
                  if (amountInput === '0') setAmountInput('');
                }}
                onChange={e => {
                  const nextValue = e.target.value;
                  if (nextValue === '') {
                    setAmountInput('');
                    return;
                  }
                  if (/^[\d.,\s]+$/.test(nextValue)) {
                    setAmountInput(nextValue);
                  }
                }}
                onBlur={() => {
                  if (!amountInput) {
                    setAmountInput('0');
                    return;
                  }
                  setAmountInput(String(normalizeCOPAmount(amountInput)));
                }}
                required
                min={1}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_AMOUNT_STEPS.map((quickAmount) => (
                  <Button
                    key={`alloc-add-${quickAmount}`}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyAmountQuickDelta(quickAmount)}
                  >
                    + {formatCOP(quickAmount)}
                  </Button>
                ))}
                {QUICK_AMOUNT_STEPS.map((quickAmount) => (
                  <Button
                    key={`alloc-sub-${quickAmount}`}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyAmountQuickDelta(-quickAmount)}
                  >
                    - {formatCOP(quickAmount)}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Vista previa: <span className="font-semibold text-slate-700">{formatCOP(normalizeCOPAmount(amountInput))}</span>
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <Button type="submit" className="w-full sm:w-auto" disabled={fundingLoading}>{editing ? 'Actualizar' : 'Crear'}</Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { setShowForm(false); setEditing(null); setFormError(''); setFormData({ wallet_id: '', budget_id: '', amount: 0, funding_wallet_id: '' }); setAmountInput('0'); }}>Cancelar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
