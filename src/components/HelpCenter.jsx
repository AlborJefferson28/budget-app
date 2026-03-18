import {
  ArrowRight,
  ArrowRightLeft,
  BookOpen,
  CircleHelp,
  LayoutDashboard,
  PieChart,
  Settings,
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
      'Abre el detalle para ver transacciones recientes de esa billetera.',
    ],
  },
  {
    id: 'transactions',
    title: 'Transacciones',
    icon: ArrowRightLeft,
    description: 'Registra ingresos, gastos y transferencias entre billeteras.',
    page: 'transactions',
    steps: [
      'Selecciona billetera origen y destino.',
      'Ingresa el monto en COP y valida la vista previa.',
      'Usa filtros para revisar historial por tipo de movimiento.',
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
  '1) Ve a Cuentas y selecciona tu cuenta activa.',
  '2) Crea 1 o 2 billeteras iniciales (ej: Sueldo y Ahorro).',
  '3) Crea tus presupuestos principales (ej: Arriendo, Servicios).',
  '4) Registra transacciones y luego asigna dinero a presupuestos.',
  '5) Revisa el Panel para controlar progreso y actividad.',
];

export default function HelpCenter({ setPage }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-2xl">Ayuda y tutoriales</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Guía completa para empezar y usar cada opción de la app.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm font-semibold text-foreground">Inicio rápido recomendado</p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {QUICK_START.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPage('accounts')} className="h-9">
              Empezar ahora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setPage('dashboard')} className="h-9">
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
