
import { useState, useMemo } from 'react';
import { useAllocations } from '../hooks/useAllocations';
import { useWallets } from '../hooks/useWallets';
import { useBudgets } from '../hooks/useBudgets';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/Select';

const STATUS = {
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700' },
};

function getStatus(idx) {
  // Demo: alternar entre completado y processing
  return idx % 3 === 2 ? 'processing' : 'completed';
}

export default function Allocations({ accountId, setPage }) {
  const { allocations, loading, error, createAllocation, updateAllocation, deleteAllocation } = useAllocations(accountId);
  const { wallets } = useWallets(accountId);
  const { budgets } = useBudgets(accountId);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ wallet_id: '', budget_id: '', amount: 0 });
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPageNum] = useState(1);
  const pageSize = 4;

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
    if (editing) {
      await updateAllocation(editing.id, formData);
      setEditing(null);
    } else {
      await createAllocation(formData);
    }
    setFormData({ wallet_id: '', budget_id: '', amount: 0 });
    setShowForm(false);
  };

  const handleEdit = (allocation) => {
    setEditing(allocation);
    setFormData({
      wallet_id: allocation.wallet_id,
      budget_id: allocation.budget_id,
      amount: allocation.amount,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta asignación?')) {
      await deleteAllocation(id);
    }
  };

  if (loading) return <div className="p-8">Cargando...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Allocations</h1>
          <p className="text-muted-foreground text-sm">Distribute funds across your budget categories.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="h-10 px-6 text-base font-semibold shadow w-full sm:w-auto">
          + New Allocation
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search transfers, wallets..."
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
                    <p className="text-xs text-muted-foreground">ORIGIN WALLET</p>
                    <p className="font-semibold">{allocation.wallets?.icon || '💰'} {allocation.wallets?.name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${STATUS[getStatus(idx)].color}`}>{STATUS[getStatus(idx)].label}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">DESTINATION BUDGET</p>
                  <p className="font-semibold">{allocation.budgets?.icon || '🏷️'} {allocation.budgets?.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">AMOUNT</p>
                    <p className="font-bold text-blue-700">${allocation.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{allocation.created_at ? new Date(allocation.created_at).toLocaleDateString() : ''}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(allocation)} className="flex-1">Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(allocation.id)} className="flex-1">Delete</Button>
                </div>
              </div>
            ))}
            {paged.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No allocations found.</p>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-3 px-6 text-left font-semibold">ORIGIN WALLET</th>
                  <th className="py-3 px-6 text-left font-semibold">DESTINATION BUDGET</th>
                  <th className="py-3 px-6 text-left font-semibold">AMOUNT</th>
                  <th className="py-3 px-6 text-left font-semibold">DATE</th>
                  <th className="py-3 px-6 text-left font-semibold">STATUS</th>
                  <th className="py-3 px-6"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((allocation, idx) => (
                  <tr key={allocation.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                    <td className="py-3 px-6 flex items-center gap-3">
                      <span className="text-2xl">{allocation.wallets?.icon || '💰'}</span>
                      <div>
                        <div className="font-semibold">{allocation.wallets?.name}</div>
                        <div className="text-xs text-muted-foreground">{allocation.wallets?.type || ''}</div>
                      </div>
                    </td>
                    <td className="py-3 px-6 flex items-center gap-3">
                      <span className="text-2xl">{allocation.budgets?.icon || '🏷️'}</span>
                      <div>
                        <div className="font-semibold">{allocation.budgets?.name}</div>
                        <div className="text-xs text-muted-foreground">{allocation.budgets?.description || ''}</div>
                      </div>
                    </td>
                    <td className="py-3 px-6 font-bold">${allocation.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-6">{allocation.created_at ? new Date(allocation.created_at).toLocaleDateString() : ''}</td>
                    <td className="py-3 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS[getStatus(idx)].color}`}>{STATUS[getStatus(idx)].label}</span>
                    </td>
                    <td className="py-3 px-6 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(allocation)}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(allocation.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No allocations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 text-xs text-muted-foreground border-t">
            <span>Showing {paged.length} of {filtered.length} allocations</span>
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
            <div className="text-xs text-muted-foreground mb-1">Total Allocated</div>
            <div className="text-2xl font-bold text-blue-700">${totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground mt-1">{allocationPercentage.toFixed(1)}% of total wallet balance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="text-xs text-muted-foreground mb-1">Most Active Wallet</div>
            <div className="text-xl font-bold">{mostActiveWallet.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{mostActiveWallet.count} allocations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="text-xs text-muted-foreground mb-1">Budget Coverage</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{budgetCoverage}%</span>
            </div>
            <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${budgetCoverage}%` }} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{new Set(allocations.map(a => a.budget_id).filter(id => id)).size} / {budgets.length} budgets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="text-xs text-muted-foreground mb-1">Average Allocation</div>
            <div className="text-2xl font-bold text-green-700">${averageAllocation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground mt-1">Per allocation</div>
          </CardContent>
        </Card>
      </div>

      {/* Modal/Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editing ? 'Editar Asignación' : 'Nueva Asignación'}</h3>
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
                type="number"
                placeholder="Monto"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                required
                min={1}
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <Button type="submit" className="w-full sm:w-auto">{editing ? 'Actualizar' : 'Crear'}</Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { setShowForm(false); setEditing(null); setFormData({ wallet_id: '', budget_id: '', amount: 0 }) }}>Cancelar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
