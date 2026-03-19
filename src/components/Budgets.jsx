
import { useEffect, useMemo, useState } from 'react';
import { useBudgets } from '../hooks/useBudgets';
import { useAllocations } from '../hooks/useAllocations';
import { useAccounts } from '../hooks/useAccounts';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { Input } from './ui/Input';
import { formatCOP, parseCOP } from '../lib/currency';
import { Trash2 } from 'lucide-react';
import { BUDGET_ICON_OPTIONS, IconGlyph, normalizeIconKey } from '../lib/icons';
import { BudgetsSkeleton } from './RouteSkeletons';
import BudgetDetail from './BudgetDetail';

const TABS = [
  { key: 'active', label: 'Metas activas' },
  { key: 'met', label: 'Metas logradas' },
  { key: 'shared', label: 'Presupuestos compartidos' },
  { key: 'archived', label: 'Archivados' },
];

const QUICK_AMOUNT_STEPS = [10000, 50000, 100000];

const normalizeCOPAmount = (value) => {
  const parsed = parseCOP(value);
  return Math.max(0, Math.round(parsed));
};

function IconPicker({ value, onChange }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Ícono</label>
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
        {BUDGET_ICON_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all hover:scale-105 ${
              value === option.key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40'
            }`}
            title={option.label}
          >
            <IconGlyph value={option.key} className="h-5 w-5" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Budgets({ accountId, setPage, selectedBudgetId, onClearSelectedBudget }) {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { budgets, loading: budgetsLoading, error: budgetsError, createBudget, updateBudget, deleteBudget } = useBudgets(accountId);
  const { allocations, loading: allocationsLoading } = useAllocations(accountId);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', target: 0, icon: 'piggy-bank' });
  const [targetInput, setTargetInput] = useState('0');
  const [editing, setEditing] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [formError, setFormError] = useState('');

  const openCreateForm = () => {
    setEditing(null);
    setFormError('');
    setFormData({ name: '', target: 0, icon: 'piggy-bank' });
    setTargetInput('0');
    setShowForm(true);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const normalizedTarget = normalizeCOPAmount(targetInput);

    if (normalizedTarget <= 0) {
      setFormError('El objetivo del presupuesto debe ser mayor a 0.');
      return;
    }

    if (editing) {
      const currentAssigned = allocations
        .filter((allocation) => allocation.budget_id === editing.id)
        .reduce((sum, allocation) => sum + (allocation.amount || 0), 0);

      if (normalizedTarget < currentAssigned) {
        setFormError(`El objetivo no puede ser menor a lo ya asignado (${formatCOP(currentAssigned)}).`);
        return;
      }
    }

    const dataToSubmit = {
      ...formData,
      target: normalizedTarget,
      icon: normalizeIconKey(formData.icon, 'piggy-bank')
    };
    if (editing) {
      await updateBudget(editing.id, dataToSubmit);
      setEditing(null);
    } else {
      await createBudget(dataToSubmit);
    }
    setFormData({ name: '', target: 0, icon: 'piggy-bank' });
    setTargetInput('0');
    setShowForm(false);
  };

  const applyTargetQuickDelta = (delta) => {
    const nextValue = Math.max(0, normalizeCOPAmount(targetInput) + delta);
    setTargetInput(String(nextValue));
  };

  const handleEdit = (budget) => {
    setEditing(budget);
    setFormError('');
    const iconKey = normalizeIconKey(budget.icon, 'piggy-bank');
    setFormData({ name: budget.name, target: budget.target, icon: iconKey });
    setTargetInput(String(normalizeCOPAmount(budget.target)));
    setShowForm(true);
  };

  const handleDelete = async (id, closeModal = false) => {
    if (window.confirm('¿Estás seguro de eliminar este presupuesto?')) {
      await deleteBudget(id);
      if (closeModal) {
        setShowForm(false);
        setEditing(null);
        setFormData({ name: '', target: 0, icon: 'piggy-bank' });
        setTargetInput('0');
      }
    }
  };

  // Calcular valores reales de current y progress basados en allocations
  const budgetsWithProgress = budgets.map((budget) => {
    const budgetAllocations = allocations.filter(allocation => allocation.budget_id === budget.id);
    const current = budgetAllocations.reduce((sum, allocation) => sum + (allocation.amount || 0), 0);
    const progress = budget.target > 0 ? current / budget.target : 0;
    return {
      ...budget,
      current,
      progress: Math.min(progress, 1), // Limitar a 100% máximo
    };
  });

  const activeAccount = useMemo(
    () => accounts.find(account => account.id === accountId) || null,
    [accounts, accountId]
  );
  const isSharedContext = activeAccount?.kind === 'shared' || activeAccount?.owner_id !== user?.id;

  const budgetsByTab = useMemo(() => {
    const active = budgetsWithProgress.filter(budget => budget.progress < 1);
    const met = budgetsWithProgress.filter(budget => budget.progress >= 1);
    const shared = isSharedContext ? budgetsWithProgress : [];
    const archived = budgetsWithProgress.filter(
      budget => budget.archived === true || budget.is_archived === true || budget.status === 'archived'
    );

    return { active, met, shared, archived };
  }, [budgetsWithProgress, isSharedContext]);

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

      {/* Grid de Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleBudgets.map((budget, idx) => {
          const status = getBudgetStatus(budget);
          return (
            <Card
              key={budget.id || idx}
              className="relative group cursor-pointer transition hover:border-primary/40"
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
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <IconGlyph value={budget.icon} fallback="piggy-bank" className="h-5 w-5" />
                </span>
                {status.label && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded bg-muted ${status.text}`}>{status.label}</span>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <CardTitle className="text-lg mb-2 flex items-center gap-2">
                  {budget.name}
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

      {/* Modal/Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h3>
            {formError && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm mb-1">Nombre</label>
              <Input
                type="text"
                placeholder="Nombre"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm mb-1">Objetivo</label>
              <Input
                type="text"
                numeric
                placeholder="Objetivo"
                value={targetInput}
                onFocus={() => {
                  if (targetInput === '0') setTargetInput('');
                }}
                onChange={e => {
                  const nextValue = e.target.value;
                  if (nextValue === '') {
                    setTargetInput('');
                    return;
                  }
                  if (/^[\d.,\s]+$/.test(nextValue)) {
                    setTargetInput(nextValue);
                  }
                }}
                onBlur={() => {
                  if (!targetInput) {
                    setTargetInput('0');
                    return;
                  }
                  setTargetInput(String(normalizeCOPAmount(targetInput)));
                }}
                required
                min={1}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_AMOUNT_STEPS.map((quickAmount) => (
                  <Button
                    key={`budget-add-${quickAmount}`}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTargetQuickDelta(quickAmount)}
                  >
                    + {formatCOP(quickAmount)}
                  </Button>
                ))}
                {QUICK_AMOUNT_STEPS.map((quickAmount) => (
                  <Button
                    key={`budget-sub-${quickAmount}`}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTargetQuickDelta(-quickAmount)}
                  >
                    - {formatCOP(quickAmount)}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Vista previa: <span className="font-semibold text-foreground">{formatCOP(normalizeCOPAmount(targetInput))}</span>
              </p>
            </div>
            <IconPicker
              value={formData.icon}
              onChange={(icon) => setFormData({ ...formData, icon })}
            />
            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto mr-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDelete(editing.id, true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              )}
              <Button type="submit" className="w-full sm:w-auto">{editing ? 'Actualizar' : 'Crear'}</Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { setShowForm(false); setEditing(null); setFormError(''); setFormData({ name: '', target: 0, icon: 'piggy-bank' }); setTargetInput('0'); }}>Cancelar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
