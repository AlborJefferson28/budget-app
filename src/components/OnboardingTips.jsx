import { useEffect, useMemo, useState } from 'react';
import { CircleHelp, Sparkles, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';

const STORAGE_KEY = 'budget-app-onboarding-dismissed-v1';

const STEPS = [
  {
    id: 'welcome',
    title: 'Bienvenido',
    description: 'Esta app te ayuda a organizar dinero por cuentas, billeteras, transacciones y presupuestos.',
  },
  {
    id: 'accounts',
    title: '1. Selecciona una cuenta',
    description: 'Empieza en Cuentas: define la cuenta activa para trabajar en el contexto correcto.',
    page: 'accounts',
    actionLabel: 'Ir a Cuentas',
  },
  {
    id: 'wallets',
    title: '2. Crea tus billeteras',
    description: 'Crea billeteras como Sueldo y Ahorro para registrar origen/destino del dinero.',
    page: 'wallets',
    actionLabel: 'Ir a Billeteras',
  },
  {
    id: 'budgets',
    title: '3. Define presupuestos',
    description: 'Crea metas (Arriendo, Servicios, etc.) y asígnales dinero desde tus billeteras.',
    page: 'budgets',
    actionLabel: 'Ir a Presupuestos',
  },
  {
    id: 'help',
    title: '4. Usa el centro de ayuda',
    description: 'Si tienes dudas, abre Ayuda y tutoriales para ver guías de todas las opciones.',
    page: 'help',
    actionLabel: 'Abrir Ayuda',
  },
];

export default function OnboardingTips({ setPage }) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === 'true';
    if (!dismissed) {
      setOpen(true);
    }
  }, []);

  const currentStep = useMemo(() => STEPS[stepIndex] || STEPS[0], [stepIndex]);
  const isLastStep = stepIndex >= STEPS.length - 1;

  const dismissPermanently = () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  const handleNext = () => {
    if (isLastStep) {
      dismissPermanently();
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handlePrev = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleGoToSection = () => {
    if (currentStep.page) {
      setPage(currentStep.page);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-2">
      {open && (
        <Card className="w-[320px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 shadow-xl">
          <CardContent className="p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{currentStep.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Paso {stepIndex + 1} de {STEPS.length}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissPermanently}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Cerrar tips"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">{currentStep.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {currentStep.page && (
                <Button size="sm" onClick={handleGoToSection}>
                  {currentStep.actionLabel || 'Ir'}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handlePrev} disabled={stepIndex === 0}>
                Anterior
              </Button>
              <Button size="sm" variant="outline" onClick={handleNext}>
                {isLastStep ? 'Finalizar' : 'Siguiente'}
              </Button>
              <button
                type="button"
                onClick={dismissPermanently}
                className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                No volver a mostrar
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {!open && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
          className="shadow-md"
        >
          <CircleHelp className="mr-2 h-4 w-4" />
          Ver tips de inicio
        </Button>
      )}
    </div>
  );
}
