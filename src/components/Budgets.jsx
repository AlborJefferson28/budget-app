
import { useState } from 'react';
import { useBudgets } from '../hooks/useBudgets';
import { useAllocations } from '../hooks/useAllocations';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { Input } from './ui/Input';
import { formatCOP, parseCOP } from '../lib/currency';
import { Trash2 } from 'lucide-react';

const ICONS = {
  plane: "✈️", laptop: "💻", book: "📚", home: "🏠", food: "🍽️",
  car: "🚗", health: "💊", savings: "🐷", salary: "💼", emergency: "🛡️",
  shopping: "🛍️", fun: "🎮", wallet: "👛", chart: "📊", gift: "🎁",
  music: "🎵", sport: "⚽", pet: "🐾", baby: "🍼", travel: "🌍",
};

const TABS = [
  { key: 'active', label: 'Metas activas' },
  { key: 'met', label: 'Metas logradas' },
  { key: 'shared', label: 'Presupuestos compartidos' },
  { key: 'archived', label: 'Archivados' },
];

function IconPicker({ value, onChange }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Ícono</label>
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
        {Object.entries(ICONS).map(([k, v]) => (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl transition-all hover:scale-105 ${
              value === k ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Budgets({ accountId, setPage }) {
  const { budgets, loading: budgetsLoading, error: budgetsError, createBudget, updateBudget, deleteBudget } = useBudgets(accountId);
  const { allocations, loading: allocationsLoading } = useAllocations(accountId);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', target: 0, icon: 'savings' });
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  // Simulación de estados para demo visual
  const getBudgetStatus = (budget) => {
    if (budget.progress >= 1) return { label: 'Meta lograda', color: 'bg-gray-400', text: 'text-gray-400' };
    if (budget.progress >= 0.85) return { label: 'Casi lista', color: 'bg-green-500', text: 'text-green-600' };
    if (budget.progress < 0.3) return { label: 'En curso', color: 'bg-orange-400', text: 'text-orange-500' };
    return { label: 'Activo', color: 'bg-blue-600', text: 'text-blue-600' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      icon: ICONS[formData.icon] || '💰'
    };
    if (editing) {
      await updateBudget(editing.id, dataToSubmit);
      setEditing(null);
    } else {
      await createBudget(dataToSubmit);
    }
    setFormData({ name: '', target: 0, icon: 'savings' });
    setShowForm(false);
  };

  const handleEdit = (budget) => {
    setEditing(budget);
    const iconKey = Object.keys(ICONS).find(key => ICONS[key] === budget.icon) || 'savings';
    setFormData({ name: budget.name, target: budget.target, icon: iconKey });
    setShowForm(true);
  };

  const handleDelete = async (id, closeModal = false) => {
    if (window.confirm('¿Estás seguro de eliminar este presupuesto?')) {
      await deleteBudget(id);
      if (closeModal) {
        setShowForm(false);
        setEditing(null);
        setFormData({ name: '', target: 0, icon: 'savings' });
      }
    }
  };

  if (budgetsLoading || allocationsLoading) return <div className="p-8">Cargando...</div>;
  if (budgetsError) return <div className="p-8 text-red-500">Error: {budgetsError.message}</div>;

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

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Metas de ahorro</h1>
          <p className="text-muted-foreground text-sm">Controla y gestiona tus objetivos financieros de largo plazo.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="h-10 px-6 text-base font-semibold shadow w-full sm:w-auto" >
          + Crear presupuesto
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 overflow-x-auto border-b mb-8 pb-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`pb-3 px-1 text-base font-medium border-b-2 transition-colors shrink-0 ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} {tab.key === 'active' && <span className="ml-1 text-xs bg-blue-100 text-blue-600 rounded px-2">{budgetsWithProgress.length}</span>}
          </button>
        ))}
      </div>

      {/* Grid de Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgetsWithProgress.map((budget, idx) => {
          const status = getBudgetStatus(budget);
          return (
            <Card key={budget.id || idx} className="relative group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <span className="text-3xl">{budget.icon || '💰'}</span>
                {status.label && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${status.text} bg-gray-100`}>{status.label}</span>
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
                    <Button size="sm" variant="outline" onClick={() => handleEdit(budget)}>Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(budget.id)} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {/* Add New Budget Card */}
        <Card className="flex flex-col items-center justify-center border-dashed border-2 min-h-[200px] cursor-pointer hover:bg-gray-50 transition" onClick={() => setShowForm(true)}>
          <div className="flex flex-col items-center">
            <span className="text-3xl mb-2">+</span>
            <span className="font-semibold">Agregar nuevo presupuesto</span>
            <span className="text-xs text-muted-foreground mt-1">Define una nueva meta de ahorro y empieza a seguir su progreso.</span>
          </div>
        </Card>
      </div>

      {/* Modal/Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h3>
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
                type="number"
                placeholder="Objetivo"
                value={formData.target}
                onChange={e => setFormData({ ...formData, target: parseCOP(e.target.value) })}
                required
                min={1}
              />
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
                  className="w-full sm:w-auto mr-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleDelete(editing.id, true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              )}
              <Button type="submit" className="w-full sm:w-auto">{editing ? 'Actualizar' : 'Crear'}</Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { setShowForm(false); setEditing(null); setFormData({ name: '', target: 0, icon: 'savings' }) }}>Cancelar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
