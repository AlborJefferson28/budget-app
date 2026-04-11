import { useEffect, useMemo, useState } from 'react';
import { CircleHelp, Sparkles, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';

const STORAGE_KEY = 'budget-app-onboarding-dismissed-v1';

const STEPS = [
  {
    id: 'welcome',
    title: 'Bienvenido',
    description: 'Esta app te ayuda a organizar dinero por cuentas, billeteras, movimientos y presupuestos.',
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
  const [isPermanentlyDismissed, setIsPermanentlyDismissed] = useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === 'true';
    if (!dismissed) {
      setOpen(true);
    } else {
      setIsPermanentlyDismissed(true);
    }
  }, []);

  const currentStep = useMemo(() => STEPS[stepIndex] || STEPS[0], [stepIndex]);
  const isLastStep = stepIndex >= STEPS.length - 1;

  const dismissPermanently = () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
    setIsPermanentlyDismissed(true);
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

  if (isPermanentlyDismissed && !open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-2">
      {open && (
        <Card className="w-[320px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 shadow-xl border-white/10 bg-[#1a1a1a]">
          <CardContent className="p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9ff3b]/10 text-[#d9ff3b]">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{currentStep.title}</p>
                  <p className="text-[11px] text-white/30">
                    Paso {stepIndex + 1} de {STEPS.length}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissPermanently}
                className="rounded-md p-1 text-white/20 hover:bg-white/5 hover:text-white"
                aria-label="Cerrar tips"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-white/60 leading-relaxed">{currentStep.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {currentStep.page && (
                <Button size="sm" onClick={handleGoToSection} className="bg-[#d9ff3b] text-black hover:bg-[#d9ff3b]/90 border-transparent">
                  {currentStep.actionLabel || 'Ir'}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handlePrev} disabled={stepIndex === 0} className="border-white/10 text-white hover:bg-white/5">
                Anterior
              </Button>
              <Button size="sm" variant="outline" onClick={handleNext} className="border-white/10 text-white hover:bg-white/5">
                {isLastStep ? 'Finalizar' : 'Siguiente'}
              </Button>
              <button
                type="button"
                onClick={dismissPermanently}
                className="ml-auto text-xs font-medium text-white/20 hover:text-[#d9ff3b]"
              >
                No ver más
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
          className="shadow-md bg-[#1a1a1a] border-white/10 text-white/60 hover:bg-white/5 hover:text-white rounded-full px-4"
        >
          <CircleHelp className="mr-2 h-4 w-4" />
          Ver tips de inicio
        </Button>
      )}
    </div>
  );
}
