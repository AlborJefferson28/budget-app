
import { useState, useMemo, useEffect } from 'react';
import { useAllocations } from '../hooks/useAllocations';
import { useWallets } from '../hooks/useWallets';
import { useBudgets } from '../hooks/useBudgets';
import { useAccounts } from '../hooks/useAccounts';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectEmpty } from './ui/Select';
import { formatCOP, formatCOPInput, formatCOPInputFromRaw, normalizeCOPAmount } from '../lib/currency';
import { accountTransfersService, walletsService } from '../services';
import { IconGlyph } from '../lib/icons';
import { AllocationsSkeleton } from './RouteSkeletons';

const QUICK_AMOUNT_STEPS = [10000, 50000, 100000];

const getErrorMessage = (error, fallback) => {
  if (!error) return fallback;
  return error.message || fallback;
};

const STATUS = {
  completed: { label: 'Completada', color: 'bg-primary/10 text-primary' },
  processing: { label: 'En proceso', color: 'bg-secondary text-secondary-foreground' },
};

const getAllocationType = (amount, average) => {
  if (!average || average <= 0) {
    return { label: 'Media', color: 'bg-muted text-muted-foreground border-border' };
  }

  if (amount >= average) {
    return { label: 'Mas', color: 'bg-primary/10 text-primary border-primary/30' };
  }

  return { label: 'Menos', color: 'bg-destructive/10 text-destructive border-destructive/30' };
};

function getStatus(idx) {
  // Demo: alternar entre completado y processing
  return idx % 3 === 2 ? 'processing' : 'completed';
}

export default function Allocations({ accountId, setPage, setSelectedWalletDetailId, setSelectedBudgetDetailId, setSelectedAccount }) {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { allocations, loading, error, createAllocation, deleteAllocation } = useAllocations(accountId);
  const { wallets, refetch: refetchWallets } = useWallets(accountId);
  const { budgets } = useBudgets(accountId);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ wallet_id: '', budget_id: '', amount: 0, funding_wallet_id: '' });
  const [amountInput, setAmountInput] = useState('0');
  const [search, setSearch] = useState('');
  const [page, setPageNum] = useState(1);
  const [personalFundingWallets, setPersonalFundingWallets] = useState([]);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [viewingAllocation, setViewingAllocation] = useState(null);
  const [amountAdjustMode, setAmountAdjustMode] = useState('add');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [contributionIdempotencyKey, setContributionIdempotencyKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 4;

  const activeAccount = useMemo(
    () => accounts.find(account => account.id === accountId) || null,
    [accounts, accountId]
  );
  const isSharedContext = activeAccount?.kind === 'shared' || activeAccount?.owner_id !== user?.id;
  const isContributorContext = isSharedContext && activeAccount?.owner_id !== user?.id;

  useEffect(() => {
    if (!showForm) return;

    setFormData(prev => ({
      ...prev,
      wallet_id: prev.wallet_id || wallets[0]?.id || '',
      budget_id: prev.budget_id || budgets[0]?.id || '',
    }));
  }, [showForm, wallets, budgets]);

  useEffect(() => {
    if (!showForm) return;

    const loadPersonalFundingWallets = async () => {
      if (!isContributorContext) {
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
  }, [showForm, isContributorContext, accounts, user?.id, accountId]);

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

  const budgetProgressMetrics = useMemo(() => {
    if (budgets.length === 0) {
      return { averageProgress: 0, completedBudgets: 0 };
    }

    const progressValues = budgets.map((budget) => {
      const allocated = allocations
        .filter(allocation => allocation.budget_id === budget.id)
        .reduce((sum, allocation) => sum + (allocation.amount || 0), 0);

      if (!budget.target || budget.target <= 0) return 0;
      return Math.min((allocated / budget.target) * 100, 100);
    });

    const averageProgress = Math.round(
      progressValues.reduce((sum, progress) => sum + progress, 0) / budgets.length
    );
    const completedBudgets = progressValues.filter(progress => progress >= 100).length;

    return { averageProgress, completedBudgets };
  }, [allocations, budgets]);

  const averageAllocation = useMemo(() => {
    return allocations.length > 0 ? totalAllocated / allocations.length : 0;
  }, [totalAllocated, allocations]);

  const allocatedByBudgetId = useMemo(() => {
    const map = {};
    allocations.forEach((allocation) => {
      if (!allocation?.budget_id) return;
      map[allocation.budget_id] = (map[allocation.budget_id] || 0) + (allocation.amount || 0);
    });
    return map;
  }, [allocations]);

  const selectedBudgetRemaining = useMemo(() => {
    const selectedBudget = budgets.find((budget) => budget.id === formData.budget_id);
    if (!selectedBudget) return null;
    const target = normalizeCOPAmount(selectedBudget.target);
    const current = normalizeCOPAmount(allocatedByBudgetId[selectedBudget.id] || 0);
    return Math.max(0, target - current);
  }, [budgets, formData.budget_id, allocatedByBudgetId]);

  const selectedWalletAvailable = useMemo(() => {
    const selectedWallet = wallets.find((wallet) => wallet.id === formData.wallet_id);
    if (!selectedWallet) return null;
    return normalizeCOPAmount(selectedWallet.balance);
  }, [wallets, formData.wallet_id]);

  const selectedFundingWalletAvailable = useMemo(() => {
    if (!formData.funding_wallet_id) return null;
    const selectedFundingWallet = personalFundingWallets.find((wallet) => wallet.id === formData.funding_wallet_id);
    if (!selectedFundingWallet) return null;
    return normalizeCOPAmount(selectedFundingWallet.balance);
  }, [personalFundingWallets, formData.funding_wallet_id]);

  const previewAllocationAmount = useMemo(
    () => normalizeCOPAmount(amountInput),
    [amountInput]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const amount = normalizeCOPAmount(amountInput);
    if (amount <= 0) {
      setFormError('Ingresa un monto válido mayor a 0.');
      return;
    }

    if (!formData.wallet_id || !formData.budget_id) {
      setFormError('Selecciona wallet y presupuesto.');
      return;
    }

    const selectedWallet = wallets.find((wallet) => wallet.id === formData.wallet_id);
    const selectedBudget = budgets.find((budget) => budget.id === formData.budget_id);
    const fundingWallet = formData.funding_wallet_id
      ? personalFundingWallets.find((wallet) => wallet.id === formData.funding_wallet_id)
      : null;

    if (!selectedWallet || !selectedBudget) {
      setFormError('No se encontraron la billetera o el presupuesto seleccionados.');
      return;
    }

    const budgetTarget = normalizeCOPAmount(selectedBudget.target);
    const budgetCurrent = normalizeCOPAmount(allocatedByBudgetId[selectedBudget.id] || 0);
    const budgetRemaining = Math.max(0, budgetTarget - budgetCurrent);

    if (budgetRemaining <= 0) {
      setFormError('Este presupuesto ya alcanzó su meta y no admite más asignaciones.');
      return;
    }

    if (amount > budgetRemaining) {
      setFormError(`Este presupuesto solo admite ${formatCOP(budgetRemaining)} adicionales.`);
      return;
    }

    if (formData.funding_wallet_id) {
      if (!isContributorContext) {
        setFormError('Solo los contribuyentes pueden aportar fondos desde cuentas personales.');
        return;
      }

      if (!fundingWallet) {
        setFormError('La billetera personal seleccionada no está disponible.');
        return;
      }

      const fundingAvailable = normalizeCOPAmount(fundingWallet.balance);
      if (amount > fundingAvailable) {
        setFormError(`Saldo insuficiente en la billetera personal. Disponible: ${formatCOP(fundingAvailable)}.`);
        return;
      }

      const { error: contributionError } = await accountTransfersService.contributeToSharedAccount({
        fromWalletId: formData.funding_wallet_id,
        toWalletId: formData.wallet_id,
        amount,
        note: `Funding allocation for ${selectedBudget?.name || 'budget'}`,
        idempotencyKey: contributionIdempotencyKey,
      });

      if (contributionError) {
        setFormError(contributionError.message || 'No fue posible aportar desde la wallet personal.');
        return;
      }
    } else {
      const walletAvailable = normalizeCOPAmount(selectedWallet.balance);
      if (amount > walletAvailable) {
        setFormError(`Saldo insuficiente en la billetera origen. Disponible: ${formatCOP(walletAvailable)}.`);
        return;
      }
    }

    setSubmitting(true);
    const { error: createError } = await createAllocation({
      wallet_id: formData.wallet_id,
      budget_id: formData.budget_id,
      amount,
      idempotency_key: idempotencyKey,
      created_by: user?.id,
    });
    setSubmitting(false);

    if (createError) {
      if (createError.code === '23505') {
        setFormError('Esta asignación ya ha sido registrada (duplicado detectado).');
      } else {
        setFormError(getErrorMessage(createError, 'No fue posible registrar la asignación.'));
      }
      return;
    }

    setFormData({ wallet_id: '', budget_id: '', amount: 0, funding_wallet_id: '' });
    setAmountInput('0');
    setAmountAdjustMode('add');
    setShowForm(false);
    await refetchWallets();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta asignación? El monto será devuelto a la billetera original.')) {
      const { error: deleteError } = await deleteAllocation(id);
      if (deleteError) {
        alert(getErrorMessage(deleteError, 'No fue posible eliminar la asignación.'));
      } else {
        setViewingAllocation(null);
        await refetchWallets();
      }
    }
  };

  const applyAmountQuickDelta = (delta) => {
    const nextValue = Math.max(0, normalizeCOPAmount(amountInput) + delta);
    setAmountInput(formatCOPInput(nextValue));
  };

  const applyAmountStepByMode = (step) => {
    const sign = amountAdjustMode === 'add' ? 1 : -1;
    applyAmountQuickDelta(step * sign);
  };

  const handleViewAllocation = (allocation) => {
    setViewingAllocation(allocation);
  };

  const canOpenSourceWallet = (allocation) => {
    const walletAccountId = allocation?.wallets?.account_id;
    if (!walletAccountId) return false;
    const sourceAccount = accounts.find(account => account.id === walletAccountId);
    return sourceAccount?.owner_id === user?.id;
  };

  const openSourceWallet = (allocation) => {
    if (!allocation?.wallet_id || !canOpenSourceWallet(allocation)) return;
    setSelectedAccount?.(allocation.wallets?.account_id || accountId);
    setSelectedWalletDetailId?.(allocation.wallet_id);
    setPage('wallets');
  };

  const openDestinationBudget = (allocation) => {
    if (!allocation?.budget_id) return;
    setSelectedAccount?.(allocation.budgets?.account_id || accountId);
    setSelectedBudgetDetailId?.(allocation.budget_id);
    setPage('budgets');
  };

  const closeViewAllocation = () => {
    setViewingAllocation(null);
  };

  const openCreateForm = () => {
    setFormError('');
    setAmountInput('0');
    setAmountAdjustMode('add');
    setFormData({ wallet_id: '', budget_id: '', amount: 0, funding_wallet_id: '' });
    setIdempotencyKey(crypto.randomUUID());
    setContributionIdempotencyKey(crypto.randomUUID());
    setShowForm(true);
  };

  if (loading) return <AllocationsSkeleton />;
  if (error) return <div className="p-8 text-destructive">Error: {error.message}</div>;

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
      <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
        Los movimientos de asignación son de solo lectura. Solo puedes visualizar su detalle.
      </div>

      {/* Tabla de asignaciones */}
      <Card className="mb-8">
        <CardContent className="p-0">
          <div className="md:hidden p-4 space-y-3">
            {paged.map((allocation, idx) => (
              <div key={allocation.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">BILLETERA ORIGEN</p>
                    <button
                      type="button"
                      onClick={() => openSourceWallet(allocation)}
                      disabled={!canOpenSourceWallet(allocation)}
                      className={`mt-1 inline-flex items-center gap-2 rounded-md border border-border bg-primary/10 px-2.5 py-1.5 ${
                        canOpenSourceWallet(allocation) ? 'hover:bg-primary/20' : 'cursor-default opacity-70'
                      }`}
                    >
                      <IconGlyph value={allocation.wallets?.icon} fallback="wallet" className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-foreground">{allocation.wallets?.name || 'Sin nombre'}</p>
                    </button>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${STATUS[getStatus(idx)].color}`}>{STATUS[getStatus(idx)].label}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">PRESUPUESTO DESTINO</p>
                  <button
                    type="button"
                    onClick={() => openDestinationBudget(allocation)}
                    className="mt-1 inline-flex items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-1.5 hover:bg-muted/70"
                  >
                    <IconGlyph value={allocation.budgets?.icon} fallback="piggy-bank" className="h-4 w-4 text-primary" />
                    <p className="font-semibold text-foreground">{allocation.budgets?.name || 'Sin nombre'}</p>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">MONTO</p>
                    <p className="font-bold text-primary">{formatCOP(allocation.amount)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{allocation.created_at ? new Date(allocation.created_at).toLocaleDateString() : ''}</p>
                </div>
                <div className="pt-1 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleViewAllocation(allocation)} className="flex-1">Ver</Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(allocation.id)} className="text-destructive border-destructive/30 hover:bg-destructive/10">Eliminar</Button>
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
                  <th className="py-3 px-6 text-left font-semibold">FECHA</th>
                  <th className="py-3 px-6 text-left font-semibold">ESTADO</th>
                  <th className="py-3 px-6 text-left font-semibold">MOVIMIENTO</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((allocation, idx) => (
                  <tr key={allocation.id} className="border-b last:border-0 hover:bg-muted/40 transition">
                    <td className="py-3 px-6">
                      <button
                        type="button"
                        onClick={() => openSourceWallet(allocation)}
                        disabled={!canOpenSourceWallet(allocation)}
                        className={`inline-flex items-center gap-2 rounded-lg border border-border bg-primary/10 px-3 py-2 ${
                          canOpenSourceWallet(allocation) ? 'hover:bg-primary/20' : 'cursor-default opacity-70'
                        }`}
                      >
                        <IconGlyph value={allocation.wallets?.icon} fallback="wallet" className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-semibold text-foreground">{allocation.wallets?.name || 'Sin nombre'}</div>
                          <div className="text-xs text-muted-foreground">Cuenta origen</div>
                        </div>
                      </button>
                    </td>
                    <td className="py-3 px-6">
                      <button
                        type="button"
                        onClick={() => openDestinationBudget(allocation)}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 hover:bg-muted/70"
                      >
                        <IconGlyph value={allocation.budgets?.icon} fallback="piggy-bank" className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-semibold text-foreground">{allocation.budgets?.name || 'Sin nombre'}</div>
                          <div className="text-xs text-muted-foreground">Presupuesto destino</div>
                        </div>
                      </button>
                    </td>
                    <td className="py-3 px-6 font-bold">{formatCOP(allocation.amount)}</td>
                    <td className="py-3 px-6">{allocation.created_at ? new Date(allocation.created_at).toLocaleDateString() : ''}</td>
                    <td className="py-3 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS[getStatus(idx)].color}`}>{STATUS[getStatus(idx)].label}</span>
                    </td>
                    <td className="py-3 px-6 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewAllocation(allocation)}>
                        Ver
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(allocation.id)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No se encontraron asignaciones.</td></tr>
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
                  className={`w-8 h-8 rounded flex items-center justify-center border ${page === i + 1 ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-accent'}`}
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
            <div className="text-2xl font-bold text-primary">{formatCOP(totalAllocated)}</div>
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
            <div className="text-xs text-muted-foreground mb-1">Cumplimiento de presupuestos</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{budgetProgressMetrics.averageProgress}%</span>
            </div>
            <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${budgetProgressMetrics.averageProgress}%` }} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {budgetProgressMetrics.completedBudgets} / {budgets.length} presupuestos completados
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="text-xs text-muted-foreground mb-1">Asignación promedio</div>
            <div className="text-2xl font-bold text-primary">{formatCOP(averageAllocation)}</div>
            <div className="text-xs text-muted-foreground mt-1">Por asignación</div>
          </CardContent>
        </Card>
      </div>

      {/* Modal/Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Nueva Asignación</h3>
            {formError && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm mb-1">Billetera Origen</label>
              <Select
                value={formData.wallet_id}
                onValueChange={v => setFormData({ ...formData, wallet_id: v })}
                disabled={wallets.length === 0}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar billetera" /></SelectTrigger>
                <SelectContent>
                  {wallets.length === 0 ? (
                    <SelectEmpty>No hay billeteras disponibles</SelectEmpty>
                  ) : (
                    wallets.map(wallet => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        <div className="flex items-center gap-2">
                          <IconGlyph value={wallet.icon} fallback="wallet" className="h-4 w-4" />
                          <span>{wallet.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {isContributorContext && (
              <div className="mb-4">
                <label className="block text-sm mb-1">Aportar desde wallet personal (opcional)</label>
                <select
                  value={formData.funding_wallet_id}
                  onChange={e => setFormData({ ...formData, funding_wallet_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={fundingLoading || personalFundingWallets.length === 0}
                >
                  <option value="">
                    {fundingLoading
                      ? 'Cargando wallets personales...'
                      : personalFundingWallets.length === 0
                        ? 'No hay wallets personales disponibles'
                        : 'No usar wallet personal'}
                  </option>
                  {personalFundingWallets.map(wallet => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.account_name}) - {formatCOP(wallet.balance)}
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
              <Select
                value={formData.budget_id}
                onValueChange={v => setFormData({ ...formData, budget_id: v })}
                disabled={budgets.length === 0}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar presupuesto" /></SelectTrigger>
                <SelectContent>
                  {budgets.length === 0 ? (
                    <SelectEmpty>No hay presupuestos disponibles</SelectEmpty>
                  ) : (
                    budgets.map(budget => (
                      <SelectItem key={budget.id} value={budget.id}>
                        <div className="flex items-center gap-2">
                          <IconGlyph value={budget.icon} fallback="piggy-bank" className="h-4 w-4" />
                          <span>{budget.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedBudgetRemaining !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Disponible por asignar en este presupuesto: <span className="font-semibold text-foreground">{formatCOP(selectedBudgetRemaining)}</span>
                </p>
              )}
            </div>
            <div className="mb-6">
              <label className="block text-sm mb-1">Monto</label>
              <Input
                type="text"
                numeric
                placeholder="Monto"
                value={amountInput}
                onFocus={() => {
                  if (amountInput === '0') setAmountInput('');
                }}
                onChange={e => {
                  setAmountInput(formatCOPInputFromRaw(e.target.value));
                }}
                onBlur={() => {
                  setAmountInput(formatCOPInput(amountInput));
                }}
                required
                min={1}
              />
              <div className="mt-2 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Ajuste rápido</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={amountAdjustMode === 'add' ? 'default' : 'outline'}
                    size="sm"
                    className={amountAdjustMode === 'add' ? '' : 'border-primary/40 text-primary hover:bg-primary/10 hover:text-primary'}
                    onClick={() => setAmountAdjustMode('add')}
                  >
                    Sumar
                  </Button>
                  <Button
                    type="button"
                    variant={amountAdjustMode === 'subtract' ? 'destructive' : 'outline'}
                    size="sm"
                    className={amountAdjustMode === 'subtract' ? '' : 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive'}
                    onClick={() => setAmountAdjustMode('subtract')}
                  >
                    Restar
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {QUICK_AMOUNT_STEPS.map((quickAmount) => (
                    <Button
                      key={`alloc-step-${quickAmount}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`justify-start ${
                        amountAdjustMode === 'add'
                          ? 'border-primary/50 text-primary hover:bg-primary/10 hover:text-primary'
                          : 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive'
                      }`}
                      onClick={() => applyAmountStepByMode(quickAmount)}
                    >
                      {amountAdjustMode === 'add' ? '+' : '-'} {formatCOP(quickAmount)}
                    </Button>
                  ))}
                </div>
              </div>
              {selectedBudgetRemaining !== null && previewAllocationAmount > selectedBudgetRemaining && (
                <p className="mt-1 text-xs text-destructive">
                  Advertencia: excede lo permitido por el presupuesto. Máximo disponible: {formatCOP(selectedBudgetRemaining)}.
                </p>
              )}
              {!formData.funding_wallet_id && selectedWalletAvailable !== null && previewAllocationAmount > selectedWalletAvailable && (
                <p className="mt-1 text-xs text-destructive">
                  Advertencia: saldo insuficiente en billetera origen. Disponible: {formatCOP(selectedWalletAvailable)}.
                </p>
              )}
              {formData.funding_wallet_id && selectedFundingWalletAvailable !== null && previewAllocationAmount > selectedFundingWalletAvailable && (
                <p className="mt-1 text-xs text-destructive">
                  Advertencia: saldo insuficiente en billetera personal. Disponible: {formatCOP(selectedFundingWalletAvailable)}.
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { setShowForm(false); setFormError(''); setFormData({ wallet_id: '', budget_id: '', amount: 0, funding_wallet_id: '' }); setAmountInput('0'); setAmountAdjustMode('add'); }}>Cancelar</Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={fundingLoading || submitting}>
                {submitting ? 'Procesando...' : 'Crear'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {viewingAllocation && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Detalle de movimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Billetera origen</p>
                <p className="text-sm font-semibold text-foreground">{viewingAllocation.wallets?.name || 'Sin nombre'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Presupuesto destino</p>
                <p className="text-sm font-semibold text-foreground">{viewingAllocation.budgets?.name || 'Sin nombre'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monto</p>
                <p className="text-lg font-bold text-primary">{formatCOP(viewingAllocation.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="text-sm text-foreground">
                  {viewingAllocation.created_at ? new Date(viewingAllocation.created_at).toLocaleString('es-CO') : 'Sin fecha'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Responsable</p>
                <p className="text-sm text-foreground">
                  {viewingAllocation.profiles?.name || 'Sistema / Atribuido'}
                </p>
              </div>
              <div className="flex justify-between items-center pt-2">
                <Button type="button" variant="outline" onClick={() => handleDelete(viewingAllocation.id)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  Eliminar
                </Button>
                <Button type="button" variant="outline" onClick={closeViewAllocation}>
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
