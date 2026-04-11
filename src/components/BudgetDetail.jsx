import { useState, useMemo } from 'react'
import { ArrowLeft, PencilLine, Trash2, User } from 'lucide-react'
import { Button } from './ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { Input } from './ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { ProgressBar } from './ui/ProgressBar'
import { formatCOP } from '../lib/currency'
import { IconGlyph } from '../lib/icons'
import { useBudgetEvents } from '../hooks/useBudgetEvents'
import { useAuth } from '../contexts/AuthContext'

const formatDate = (value) => {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return parsed.toLocaleString('es-CO')
}

export default function BudgetDetail({ budget, allocations, onBack, onEdit, onDeleteAllocation }) {
  const { user } = useAuth()
  const { events: budgetEvents, loading: eventsLoading, error: eventsError } = useBudgetEvents(budget?.id)
  const [searchMovements, setSearchMovements] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const lastReset = budget?.last_reset_at ? new Date(budget.last_reset_at) : new Date(0)
  const currentAllocations = allocations.filter(a => new Date(a.created_at) >= lastReset)
  const totalAssigned = currentAllocations.reduce((sum, allocation) => sum + (allocation.amount || 0), 0)
  const target = budget?.target || 0
  const progress = target > 0 ? Math.min((totalAssigned / target) * 100, 100) : 0
  const remaining = Math.max(target - totalAssigned, 0)
  
  const filteredMovements = useMemo(() => {
    let result = [...allocations]
    
    if (searchMovements) {
      const lowerSearch = searchMovements.toLowerCase()
      result = result.filter(m => (m.wallets?.name || '').toLowerCase().includes(lowerSearch))
    }

    result.sort((a, b) => {
      let comparison = 0
      if (sortField === 'date') {
        comparison = new Date(a.created_at) - new Date(b.created_at)
      } else if (sortField === 'amount') {
        comparison = (a.amount || 0) - (b.amount || 0)
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return result
  }, [allocations, searchMovements, sortField, sortOrder])

  const sortedEditEvents = [...budgetEvents].sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))

  const getChangeLines = (event) => {
    const changedFields = Array.isArray(event?.changed_fields) ? event.changed_fields : []
    const oldData = event?.old_data || {}
    const newData = event?.new_data || {}
    const lines = []

    if (changedFields.includes('name') && oldData?.name !== newData?.name) {
      lines.push(`Nombre: "${oldData?.name || 'Sin nombre'}" -> "${newData?.name || 'Sin nombre'}"`)
    }

    if (changedFields.includes('target') && oldData?.target !== newData?.target) {
      lines.push(`Meta: ${formatCOP(oldData?.target || 0)} -> ${formatCOP(newData?.target || 0)}`)
    }

    if (changedFields.includes('icon') && oldData?.icon !== newData?.icon) {
      lines.push(`Ícono: ${oldData?.icon || 'sin ícono'} -> ${newData?.icon || 'sin ícono'}`)
    }

    if (lines.length === 0) {
      lines.push('Se actualizaron datos del presupuesto.')
    }

    return lines
  }

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
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconGlyph value={budget.icon} fallback="piggy-bank" className="h-5 w-5" />
              </span>
              {budget.name}
            </div>
            {budget.reset_period && budget.reset_period !== 'none' && (
              <div className="text-right">
                <span className="inline-flex items-center rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-bold text-secondary-foreground uppercase tracking-tight">
                  Reinicio {budget.reset_period === 'monthly' ? 'Mensual' : 
                          budget.reset_period === 'weekly' ? 'Semanal' : 'Anual'}
                </span>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Último reinicio: {formatDate(budget.last_reset_at)}
                </p>
              </div>
            )}
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Historial de movimientos</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Buscar billetera..."
                value={searchMovements}
                onChange={e => setSearchMovements(e.target.value)}
                className="w-full sm:w-48 h-9 text-sm"
              />
              <div className="flex gap-1">
                <Select value={sortField} onValueChange={setSortField}>
                  <SelectTrigger className="w-28 h-9 text-sm">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Fecha</SelectItem>
                    <SelectItem value="amount">Monto</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="h-9 w-9 p-0"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No se encontraron movimientos.</p>
          ) : (
            <div className="space-y-3">
              {filteredMovements.map((movement) => (
                <article key={movement.id} className="rounded-lg border border-border p-3 sm:p-4 hover:border-primary/30 transition-colors">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">Asignación desde {movement.wallets?.name || 'Billetera'}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs text-muted-foreground">{formatDate(movement.created_at)}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs font-medium text-foreground italic flex items-center gap-1">
                            Por: {movement.author?.name || 'Sistema'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <span className="text-sm font-bold text-primary">+{formatCOP(movement.amount || 0)}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          if (window.confirm('¿Seguro que quieres eliminar esta asignación? El saldo volverá a la billetera.')) {
                            onDeleteAllocation?.(movement.id)
                          }
                        }}
                        className="h-8 w-8 p-0 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial de ediciones del presupuesto</CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <p className="text-sm text-muted-foreground">Cargando historial de ediciones...</p>
          ) : eventsError ? (
            <p className="text-sm text-destructive">No se pudo cargar el historial de ediciones.</p>
          ) : sortedEditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay ediciones registradas para este presupuesto.</p>
          ) : (
            <div className="space-y-3">
              {sortedEditEvents.map((event) => {
                const changedByLabel = event.changed_by === user?.id ? 'Tú' : 'Miembro'
                const changeLines = getChangeLines(event)

                return (
                  <article key={event.id} className="rounded-lg border border-border p-3 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <PencilLine className="h-4 w-4 text-primary" />
                          Edición de presupuesto
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {changedByLabel} - {formatDate(event.changed_at)}
                        </p>
                        <div className="mt-2 space-y-1">
                          {changeLines.map((line, index) => (
                            <p key={`${event.id}-change-${index}`} className="text-xs text-muted-foreground break-words">
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                        Editado
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
