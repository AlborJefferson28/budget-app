
import { useEffect, useMemo, useState } from 'react';
import { useBudgets } from '../hooks/useBudgets';
import { useAllocations } from '../hooks/useAllocations';
import { useAccounts } from '../hooks/useAccounts';
import { useWallets } from '../hooks/useWallets';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { Input } from './ui/Input';
import { formatCOP, formatCOPInput, formatCOPInputFromRaw, normalizeCOPAmount } from '../lib/currency';
import { Trash2 } from 'lucide-react';
import { BUDGET_ICON_OPTIONS, IconGlyph, normalizeIconKey } from '../lib/icons';
import BudgetModal from './modals/BudgetModal';
import { BudgetsSkeleton } from './RouteSkeletons';
import BudgetDetail from './BudgetDetail';
import { Checkbox } from './ui/Checkbox';
import BulkPayModal from './modals/BulkPayModal';

const TABS = [
  { key: 'active', label: 'Metas activas' },
  { key: 'met', label: 'Metas logradas' },
  { key: 'shared', label: 'Presupuestos compartidos' },
  { key: 'archived', label: 'Archivados' },
];

export default function Budgets({ accountId, setPage, selectedBudgetId, onClearSelectedBudget }) {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { budgets, loading: budgetsLoading, error: budgetsError, updateBudget, deleteBudget, refetch: refetchBudgets } = useBudgets(accountId);
  const { allocations, loading: allocationsLoading, deleteAllocation, createAllocationsBulk, refetch: refetchAllocations } = useAllocations(accountId);
  const { wallets, refetch: refetchWallets } = useWallets(accountId);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [searchBudgets, setSearchBudgets] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedBudgetIds, setSelectedBudgetIds] = useState([]);
  const [showBulkPayModal, setShowBulkPayModal] = useState(false);

  const needsReset = (budget) => {
    if (!budget.reset_period || budget.reset_period === 'none') return false;
    const lastReset = new Date(budget.last_reset_at || 0);
    const now = new Date();
    
    if (budget.reset_period === 'monthly') {
      return lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear();
    }
    if (budget.reset_period === 'weekly') {
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      return (now - lastReset) > oneWeek;
    }
    if (budget.reset_period === 'yearly') {
      return lastReset.getFullYear() !== now.getFullYear();
    }
    return false;
  };

  useEffect(() => {
    if (budgetsLoading || !budgets.length) return;
    
    budgets.forEach(budget => {
      if (needsReset(budget)) {
        updateBudget(budget.id, { last_reset_at: new Date().toISOString() });
      }
    });
  }, [budgets, budgetsLoading]);

  const openCreateForm = () => {
    setEditingBudget(null);
    setShowModal(true);
  };

  useEffect(() => {
    if (!selectedBudgetId) return;
    const matchedBudget = budgets.find((budget) => budget.id === selectedBudgetId);
    if (matchedBudget) {
      setSelectedBudget(matchedBudget);
      onClearSelectedBudget?.();
    }
  }, [selectedBudgetId, budgets, onClearSelectedBudget]);

  // Simulación de estados para demo visual
  const getBudgetStatus = (budget) => {
    if (budget.progress >= 1) return { label: 'Meta lograda', color: 'bg-primary', text: 'text-primary' };
    if (budget.progress >= 0.85) return { label: 'Casi lista', color: 'bg-primary', text: 'text-primary' };
    if (budget.progress < 0.3) return { label: 'En curso', color: 'bg-secondary', text: 'text-muted-foreground' };
    return { label: 'Activo', color: 'bg-primary', text: 'text-primary' };
  };


  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este presupuesto?')) {
      await deleteBudget(id);
    }
  };

  // Calcular valores reales de current y progress basados en allocations y last_reset_at
  const budgetsWithProgress = budgets.map((budget) => {
    const lastReset = budget.last_reset_at ? new Date(budget.last_reset_at) : new Date(0);
    const budgetAllocations = allocations.filter(allocation => 
      allocation.budget_id === budget.id && 
      new Date(allocation.created_at) >= lastReset
    );
    const current = budgetAllocations.reduce((sum, allocation) => sum + (allocation.amount || 0), 0);
    const progress = budget.target > 0 ? current / budget.target : 0;
    return {
      ...budget,
      current,
      progress: Math.min(progress, 1),
    };
  });

  const activeAccount = useMemo(
    () => accounts.find(account => account.id === accountId) || null,
    [accounts, accountId]
  );
  const isSharedContext = activeAccount?.kind === 'shared' || activeAccount?.owner_id !== user?.id;

  const budgetsByTab = useMemo(() => {
    let base = [...budgetsWithProgress];

    if (searchBudgets) {
      const lowerSearch = searchBudgets.toLowerCase();
      base = base.filter(b => b.name.toLowerCase().includes(lowerSearch));
    }

    base.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'target') {
        comparison = (a.target || 0) - (b.target || 0);
      } else if (sortField === 'progress') {
        comparison = (a.progress || 0) - (b.progress || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    const active = base.filter(budget => budget.progress < 1);
    const met = base.filter(budget => budget.progress >= 1);
    const shared = isSharedContext ? base : [];
    const archived = base.filter(
      budget => budget.archived === true || budget.is_archived === true || budget.status === 'archived'
    );

    return { active, met, shared, archived };
  }, [budgetsWithProgress, isSharedContext, searchBudgets, sortField, sortOrder]);

  const visibleBudgets = budgetsByTab[activeTab] || [];
  const shouldShowCreateCard = activeTab !== 'met' && activeTab !== 'archived';
  const emptyByTab = {
    active: 'No tienes metas activas por ahora.',
    met: 'Aún no has logrado metas.',
    shared: isSharedContext ? 'No hay presupuestos compartidos en esta cuenta.' : 'Esta cuenta no es compartida.',
    archived: 'No hay presupuestos archivados.',
  };

  if (budgetsLoading || allocationsLoading) return <BudgetsSkeleton />;
  if (budgetsError) return <div className="p-8 text-destructive">Error: {budgetsError.message}</div>;

  const toggleSelectBudget = (id) => {
    setSelectedBudgetIds(prev => 
      prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]
    );
  };

  const handleBulkPaySuccess = () => {
    setSelectedBudgetIds([]);
    refetchAllocations();
    refetchWallets();
  };

  const selectedBudgetsData = budgetsWithProgress.filter(b => selectedBudgetIds.includes(b.id));

  if (selectedBudget) {
    const budgetWithProgress = budgetsWithProgress.find((budget) => budget.id === selectedBudget.id) || selectedBudget;
    const budgetAllocations = allocations.filter((allocation) => allocation.budget_id === selectedBudget.id);

    return (
      <BudgetDetail
        budget={budgetWithProgress}
        allocations={budgetAllocations}
        onBack={() => {
          setSelectedBudget(null);
          onClearSelectedBudget?.();
        }}
        onEdit={() => {
          setSelectedBudget(null);
          onClearSelectedBudget?.();
          handleEdit(budgetWithProgress);
        }}
        onDeleteAllocation={async (id) => {
          await deleteAllocation(id);
          refetchWallets();
        }}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Metas de ahorro</h1>
          <p className="text-muted-foreground text-sm">Controla y gestiona tus objetivos financieros de largo plazo.</p>
        </div>
        <Button onClick={openCreateForm} className="h-10 px-6 text-base font-semibold shadow w-full sm:w-auto" >
          + Crear presupuesto
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 overflow-x-auto border-b mb-8 pb-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`pb-3 px-1 text-base font-medium border-b-2 transition-colors shrink-0 ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="ml-1 text-xs bg-primary/10 text-primary rounded px-2">{(budgetsByTab[tab.key] || []).length}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar presupuesto..."
            value={searchBudgets}
            onChange={e => setSearchBudgets(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Select value={sortField} onValueChange={setSortField}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nombre</SelectItem>
              <SelectItem value="target">Meta</SelectItem>
              <SelectItem value="progress">Progreso</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="w-10 p-0"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>

      {/* Grid de Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleBudgets.map((budget, idx) => {
          const status = getBudgetStatus(budget);
          return (
            <Card
              key={budget.id || idx}
              className={`relative group cursor-pointer transition hover:border-primary/40 ${selectedBudgetIds.includes(budget.id) ? 'border-primary ring-1 ring-primary/20 bg-primary/[0.02]' : ''}`}
              onClick={() => setSelectedBudget(budget)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedBudget(budget);
                }
              }}
            >
              <div 
                className="absolute top-3 right-3 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox 
                  checked={selectedBudgetIds.includes(budget.id)}
                  onCheckedChange={() => toggleSelectBudget(budget.id)}
                  className="h-5 w-5 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <IconGlyph value={budget.icon} fallback="piggy-bank" className="h-5 w-5" />
                </span>
                {status.label && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded bg-muted ${status.text}`}>{status.label}</span>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <CardTitle className="text-lg mb-2 flex items-center justify-between gap-2">
                  <span className="truncate">{budget.name}</span>
                  {budget.reset_period && budget.reset_period !== 'none' && (
                    <span className="inline-flex items-center rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-bold text-secondary-foreground uppercase tracking-tight">
                      {budget.reset_period === 'monthly' ? 'Mensual' : 
                       budget.reset_period === 'weekly' ? 'Semanal' : 'Anual'}
                    </span>
                  )}
                </CardTitle>
                <div className="mb-2">
                  <ProgressBar value={Math.round(budget.progress * 100)} color={status.color} />
                  <div className="flex justify-between text-xs mt-1">
                    <span className="font-semibold">Progreso</span>
                    <span className="font-semibold">{Math.round(budget.progress * 100)}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className="block text-xs text-muted-foreground">ACTUAL / META</span>
                    <span className="font-bold text-base">{formatCOP(budget.current)} / {formatCOP(budget.target)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleEdit(budget); }}>Editar</Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDelete(budget.id); }} className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {shouldShowCreateCard && (
          <Card className="flex flex-col items-center justify-center border-dashed border-2 border-border min-h-[200px] cursor-pointer hover:bg-muted/40 transition" onClick={openCreateForm}>
            <div className="flex flex-col items-center">
              <span className="text-3xl mb-2">+</span>
              <span className="font-semibold">Agregar nuevo presupuesto</span>
              <span className="text-xs text-muted-foreground mt-1">Define una nueva meta de ahorro y empieza a seguir su progreso.</span>
            </div>
          </Card>
        )}
      </div>

      {visibleBudgets.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">{emptyByTab[activeTab]}</p>
      )}

      <BudgetModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingBudget(null);
        }}
        accountId={accountId}
        editingBudget={editingBudget}
        onSuccess={() => refetchBudgets()}
      />

      <BulkPayModal
        open={showBulkPayModal}
        onClose={() => setShowBulkPayModal(false)}
        selectedBudgets={selectedBudgetsData}
        wallets={wallets}
        onCreateAllocations={createAllocationsBulk}
        userId={user?.id}
        onSuccess={handleBulkPaySuccess}
      />

      {/* Floating Bulk Actions Bar */}
      {selectedBudgetIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-lg">
          <div className="bg-foreground text-background rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/10 text-background">
                <span className="font-bold">{selectedBudgetIds.length}</span>
              </div>
              <div>
                <p className="text-sm font-bold">Seleccionados</p>
                <button 
                  onClick={() => setSelectedBudgetIds([])}
                  className="text-xs text-background/60 hover:text-background underline decoration-dotted"
                >
                  Desmarcar todos
                </button>
              </div>
            </div>
            <Button 
              onClick={() => setShowBulkPayModal(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 h-11 rounded-xl shadow-lg shadow-primary/20"
            >
              Pagar seleccionado(s)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
