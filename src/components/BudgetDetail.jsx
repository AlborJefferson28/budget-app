import { ArrowLeft } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { ProgressBar } from './ui/ProgressBar'
import { formatCOP } from '../lib/currency'
import { IconGlyph } from '../lib/icons'

const formatDate = (value) => {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return parsed.toLocaleString('es-CO')
}

export default function BudgetDetail({ budget, allocations, onBack, onEdit }) {
  const totalAssigned = allocations.reduce((sum, allocation) => sum + (allocation.amount || 0), 0)
  const target = budget?.target || 0
  const progress = target > 0 ? Math.min((totalAssigned / target) * 100, 100) : 0
  const remaining = Math.max(target - totalAssigned, 0)
  const sortedMovements = [...allocations].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Detalle de presupuesto</h1>
        </div>
        <Button onClick={onEdit} className="w-full sm:w-auto">Editar presupuesto</Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconGlyph value={budget.icon} fallback="piggy-bank" className="h-5 w-5" />
            </span>
            {budget.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <ProgressBar value={Math.round(progress)} color="bg-primary" />
            <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>Progreso</span>
              <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Meta</p>
              <p className="mt-1 text-xl font-bold">{formatCOP(target)}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Asignado</p>
              <p className="mt-1 text-xl font-bold text-primary">{formatCOP(totalAssigned)}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Restante</p>
              <p className="mt-1 text-xl font-bold">{formatCOP(remaining)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de movimientos del presupuesto</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay asignaciones para este presupuesto.</p>
          ) : (
            <div className="space-y-3">
              {sortedMovements.map((movement) => (
                <article key={movement.id} className="rounded-lg border border-border p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Asignación desde {movement.wallets?.name || 'Billetera'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(movement.created_at)}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">+{formatCOP(movement.amount || 0)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
