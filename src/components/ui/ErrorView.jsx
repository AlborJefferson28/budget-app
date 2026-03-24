import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react'
import { Button } from './Button'

export function ErrorView({
  title = 'Algo salió mal',
  message = 'No pudimos cargar la información. Por favor, inténtalo de nuevo.',
  onRetry,
  showHome = false,
  onHome,
  className,
}) {
  return (
    <div className={`flex min-h-[400px] flex-col items-center justify-center p-6 text-center ${className}`}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      
      <h2 className="mb-2 text-xl font-semibold text-foreground">{title}</h2>
      
      <p className="mb-6 max-w-md text-sm text-muted-foreground">{message}</p>
      
      <div className="flex flex-col gap-3 sm:flex-row">
        {onRetry && (
          <Button onClick={onRetry} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        )}
        
        {showHome && onHome && (
          <Button onClick={onHome} variant="outline">
            <Home className="mr-2 h-4 w-4" />
            Volver al inicio
          </Button>
        )}
      </div>
      
      <p className="mt-8 text-xs text-muted-foreground">
        Si el problema persiste, contacta a soporte.
      </p>
    </div>
  )
}

export function FullPageError({ error, onRetry }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Problema técnico
          </h1>
          
          <p className="mb-6 text-muted-foreground">
            La aplicación encontró un error que impide mostrarse correctamente.
            Esto puede ser un problema temporal de conexión o de nuestros servidores.
          </p>
          
          {onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          )}
          
          <p className="mt-6 text-xs text-muted-foreground">
            Código de error: {error?.name || 'UNKNOWN_ERROR'}
          </p>
        </div>
      </div>
    </div>
  )
}
