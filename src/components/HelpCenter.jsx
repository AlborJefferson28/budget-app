import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  LayoutDashboard,
  PieChart,
  Settings,
  Sparkles,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

const GUIDE_SECTIONS = [
  {
    id: 'dashboard',
    title: 'Panel',
    icon: LayoutDashboard,
    description: 'Vista rápida de saldos, actividad reciente y accesos directos.',
    page: 'dashboard',
    steps: [
      'Revisa el balance total y el gasto mensual.',
      'Usa las acciones rápidas para crear billeteras o presupuestos.',
      'Consulta actividad reciente para validar movimientos.',
    ],
  },
  {
    id: 'wallets',
    title: 'Billeteras',
    icon: Wallet,
    description: 'Aquí defines las fuentes/destinos de dinero de una cuenta.',
    page: 'wallets',
    steps: [
      'Crea al menos una billetera (por ejemplo: Sueldo, Ahorro).',
      'Edita saldo inicial y nombre cuando lo necesites.',
      'Cuando tengas más de una, usa el botón de transferir en cada tarjeta para mover dinero entre billeteras.',
      'Abre el detalle para ver transacciones recientes de esa billetera.',
    ],
  },
  {
    id: 'budgets',
    title: 'Presupuestos',
    icon: Target,
    description: 'Define metas y controla el progreso de ahorro.',
    page: 'budgets',
    steps: [
      'Crea un presupuesto con nombre, ícono y meta.',
      'La barra de progreso muestra avance contra la meta.',
      'Usa tabs para ver activos, logrados y archivados.',
    ],
  },
  {
    id: 'allocations',
    title: 'Asignaciones',
    icon: PieChart,
    description: 'Distribuye dinero desde billeteras hacia presupuestos.',
    page: 'allocations',
    steps: [
      'Elige billetera origen y presupuesto destino.',
      'Asigna el monto y confirma.',
      'Revisa la tabla para validar origen, destino y tipo de asignación.',
    ],
  },
  {
    id: 'accounts',
    title: 'Cuentas',
    icon: Users,
    description: 'Gestiona cuentas personales/compartidas y miembros.',
    page: 'accounts',
    steps: [
      'Crea o selecciona la cuenta en la que trabajarás.',
      'Gestiona miembros en cuentas compartidas.',
      'Consulta el historial de aportes entre cuentas.',
    ],
  },
  {
    id: 'profile',
    title: 'Perfil y configuración',
    icon: Settings,
    description: 'Actualiza perfil, contraseña y ajustes de seguridad.',
    page: 'profile',
    steps: [
      'Actualiza tu nombre visible.',
      'Cambia tu contraseña desde seguridad.',
      'Usa la zona de peligro solo cuando quieras eliminar tu usuario.',
    ],
  },
];

const QUICK_START = [
  {
    title: 'Selecciona tu cuenta activa',
    description: 'Ve a Cuentas y confirma en qué cuenta vas a trabajar.',
  },
  {
    title: 'Crea 1 o 2 billeteras iniciales',
    description: 'Por ejemplo: Sueldo y Ahorro.',
  },
  {
    title: 'Configura tus presupuestos principales',
    description: 'Por ejemplo: Arriendo, Servicios, Mercado.',
  },
  {
    title: 'Mueve dinero y asigna a presupuestos',
    description: 'Primero entre billeteras y luego hacia tus metas.',
  },
  {
    title: 'Monitorea todo desde el panel',
    description: 'Valida progreso, actividad reciente y totales.',
  },
];

export default function HelpCenter({ setPage }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-primary/5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
        />
        <CardHeader className="relative pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-2xl sm:text-3xl">Ayuda y tutoriales</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Guía completa para empezar y usar cada opción de la app.
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Ruta recomendada
            </span>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="rounded-xl border border-border/80 bg-background/60 p-4 backdrop-blur-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <p className="text-sm font-semibold text-foreground">Inicio rápido recomendado</p>
            </div>
            <ol className="space-y-2.5">
              {QUICK_START.map((item, index) => (
                <li key={item.title} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/80 p-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <CheckCircle2 className="mt-0.5 hidden h-4 w-4 shrink-0 text-primary/80 sm:block" />
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setPage('accounts')} className="h-10 sm:h-9">
              Empezar ahora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setPage('dashboard')} className="h-10 sm:h-9">
              Volver al panel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {GUIDE_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1 text-sm text-muted-foreground">
                  {section.steps.map((step) => (
                    <p key={step}>• {step}</p>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => setPage(section.page)}>
                  Ir a {section.title}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CircleHelp className="h-4 w-4" />
            </span>
            <CardTitle className="text-lg">Preguntas frecuentes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <details className="rounded-md border border-border bg-card p-3">
            <summary className="cursor-pointer text-sm font-medium">¿Qué hago primero al entrar por primera vez?</summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Selecciona/crea cuenta, crea billeteras, luego presupuestos y finalmente registra transacciones y asignaciones.
            </p>
          </details>
          <details className="rounded-md border border-border bg-card p-3">
            <summary className="cursor-pointer text-sm font-medium">¿Cuál es la diferencia entre transacción y asignación?</summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Transacción mueve dinero entre billeteras (o entrada/salida). Asignación mueve dinero de una billetera hacia un presupuesto.
            </p>
          </details>
          <details className="rounded-md border border-border bg-card p-3">
            <summary className="cursor-pointer text-sm font-medium">¿Dónde veo en qué cuenta estoy trabajando?</summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Arriba del contenido principal, en el bloque “Contexto actual de cuenta”.
            </p>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
