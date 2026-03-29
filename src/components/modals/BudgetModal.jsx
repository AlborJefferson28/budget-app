import { useState, useEffect } from 'react';
import { useBudgets } from '../../hooks/useBudgets';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { formatCOP, formatCOPInput, formatCOPInputFromRaw, normalizeCOPAmount } from '../../lib/currency';
import { normalizeIconKey } from '../../lib/icons';
import { AmountInput } from '../ui/AmountInput';
import { IconPicker } from '../ui/IconPicker';
import { Trash2 } from 'lucide-react';

export default function BudgetModal({ open, onClose, accountId, editingBudget = null, onSuccess }) {
  const { createBudget, updateBudget, deleteBudget } = useBudgets(accountId);
  const [formData, setFormData] = useState({ name: '', target: 0, icon: 'piggy-bank', reset_period: 'none' });
  const [targetInput, setTargetInput] = useState('0');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    if (open) {
      if (editingBudget) {
        setFormData({
          name: editingBudget.name,
          target: editingBudget.target,
          icon: normalizeIconKey(editingBudget.icon, 'piggy-bank'),
          reset_period: editingBudget.reset_period || 'none'
        });
        setTargetInput(formatCOPInput(editingBudget.target));
      } else {
        setFormData({ name: '', target: 0, icon: 'piggy-bank', reset_period: 'none' });
        setTargetInput('0');
        setIdempotencyKey(crypto.randomUUID());
      }
      setFormError('');
    }
  }, [open, editingBudget]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const normalizedTarget = normalizeCOPAmount(targetInput);

    if (normalizedTarget <= 0) {
      setFormError('El objetivo del presupuesto debe ser mayor a 0.');
      return;
    }

    const dataToSubmit = {
      ...formData,
      target: normalizedTarget,
      icon: normalizeIconKey(formData.icon, 'piggy-bank')
    };

    setSubmitting(true);
    let result;
    if (editingBudget) {
      result = await updateBudget(editingBudget.id, dataToSubmit);
    } else {
      result = await createBudget({ ...dataToSubmit, idempotency_key: idempotencyKey });
    }
    setSubmitting(false);

    if (result?.error) {
      if (result.error.code === '23505') {
        setFormError('Este presupuesto ya existe (duplicado).');
      } else {
        setFormError(result.error.message || 'Error al procesar el presupuesto.');
      }
      return;
    }

    onSuccess?.();
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de eliminar este presupuesto?')) {
      await deleteBudget(editingBudget.id);
      onSuccess?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <h3 className="text-xl font-bold mb-4">{editingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h3>
        
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
              placeholder="Ej: Ahorro para Viaje"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Objetivo</label>
            <AmountInput
              type="text"
              numeric
              placeholder="0"
              value={targetInput}
              onFocus={() => targetInput === '0' && setTargetInput('')}
              onChange={e => setTargetInput(formatCOPInputFromRaw(e.target.value))}
              onBlur={() => setTargetInput(formatCOPInput(targetInput))}
              onStep={(val) => setTargetInput(formatCOPInput(val))}
              required
            />
          </div>

          <IconPicker
            value={formData.icon}
            onChange={(icon) => setFormData({ ...formData, icon })}
          />

          <div>
            <label className="block text-sm font-medium mb-1.5">Reinicio periódico</label>
            <Select 
              value={formData.reset_period} 
              onValueChange={(val) => setFormData({ ...formData, reset_period: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Frecuencia de reinicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin reinicio automático</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground italic">
              {formData.reset_period === 'none' ? 
                'El progreso se mantendrá indefinidamente.' : 
                'El progreso volverá a 0% al iniciar cada nuevo periodo.'}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-2 sm:justify-end">
          {editingBudget && (
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
            {submitting ? 'Procesando...' : (editingBudget ? 'Actualizar' : 'Crear')}
          </Button>
        </div>
      </form>
    </div>
  );
}
