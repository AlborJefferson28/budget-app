import React, { useState, useRef, useEffect } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Minus, Plus } from 'lucide-react';
import { formatCOP, normalizeCOPAmount } from '../../lib/currency';

const QUICK_AMOUNTS = [10000, 50000, 100000];
const DEFAULT_STEP = 1000;

export function AmountInput({ 
  value, 
  onChange, 
  onStep, 
  className,
  ...props 
}) {
  const [speedDial, setSpeedDial] = useState({ open: false, mode: null });
  const timerRef = useRef(null);
  const skipNextClickRef = useRef(false);

  const applyStep = (step, mode) => {
     const currentVal = normalizeCOPAmount(value?.toString() || '0');
     let newVal;
     if (mode === 'add') {
        newVal = currentVal + step;
     } else {
        newVal = Math.max(0, currentVal - step);
     }
     onStep?.(newVal);
  };

  const handleClick = (e, mode) => {
     e.preventDefault();
     if (skipNextClickRef.current) {
        skipNextClickRef.current = false;
        return;
     }
     applyStep(DEFAULT_STEP, mode);
  };

  const handlePointerDown = (e, mode) => {
     if (e.pointerType === 'mouse' && e.button !== 0) return;
     
     // Clear any existing timer
     if (timerRef.current) clearTimeout(timerRef.current);
     
     timerRef.current = setTimeout(() => {
        setSpeedDial({ open: true, mode });
        skipNextClickRef.current = true; // prevent the click event from firing when they lift finger
     }, 400); // 400ms long press
  };

  const handlePointerUpOrLeave = () => {
     if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
     return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
     };
  }, []);

  return (
    <div className={`relative flex items-center ${className || ''}`}>
      {/* Left Menu */}
      {speedDial.open && speedDial.mode === 'subtract' && (
        <React.Fragment>
          <div className="fixed inset-0 z-40 touch-none" onPointerDown={() => setSpeedDial({ open: false, mode: null })} />
          <div className="absolute z-50 bottom-full left-0 mb-2 flex flex-col gap-1 bg-popover border border-border rounded-md shadow-2xl p-1 animate-in fade-in slide-in-from-bottom-2">
            {QUICK_AMOUNTS.map(val => (
               <button
                  type="button"
                  key={`sub-${val}`}
                  className="px-4 py-2 text-sm font-medium text-left whitespace-nowrap hover:bg-destructive/10 text-destructive rounded-sm transition-colors"
                  onClick={(e) => {
                     e.preventDefault();
                     applyStep(val, 'subtract');
                     setSpeedDial({ open: false, mode: null });
                     skipNextClickRef.current = true;
                  }}
               >
                 - {formatCOP(val)}
               </button>
            ))}
          </div>
        </React.Fragment>
      )}

      <Button
        type="button"
        variant="outline"
        className="shrink-0 rounded-r-none border-r-0 touch-none px-3 h-10 select-none active:bg-accent/50"
        onClick={(e) => handleClick(e, 'subtract')}
        onPointerDown={(e) => handlePointerDown(e, 'subtract')}
        onPointerUp={handlePointerUpOrLeave}
        onPointerLeave={handlePointerUpOrLeave}
        onPointerCancel={handlePointerUpOrLeave}
        onContextMenu={(e) => e.preventDefault()} // prevent native context menu on long press
      >
        <Minus className="w-4 h-4" />
      </Button>

      <Input
        value={value}
        onChange={onChange}
        className="rounded-none text-center font-medium focus-visible:z-10"
        {...props}
      />

      <Button
        type="button"
        variant="outline"
        className="shrink-0 rounded-l-none border-l-0 touch-none px-3 h-10 select-none active:bg-accent/50"
        onClick={(e) => handleClick(e, 'add')}
        onPointerDown={(e) => handlePointerDown(e, 'add')}
        onPointerUp={handlePointerUpOrLeave}
        onPointerLeave={handlePointerUpOrLeave}
        onPointerCancel={handlePointerUpOrLeave}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Plus className="w-4 h-4" />
      </Button>

      {/* Right Menu */}
      {speedDial.open && speedDial.mode === 'add' && (
        <React.Fragment>
          <div className="fixed inset-0 z-40 touch-none" onPointerDown={() => setSpeedDial({ open: false, mode: null })} />
          <div className="absolute z-50 bottom-full right-0 mb-2 flex flex-col gap-1 bg-popover border border-border rounded-md shadow-2xl p-1 animate-in fade-in slide-in-from-bottom-2">
            {QUICK_AMOUNTS.map(val => (
               <button
                  type="button"
                  key={`add-${val}`}
                  className="px-4 py-2 text-sm font-medium text-right whitespace-nowrap hover:bg-primary/10 text-primary rounded-sm transition-colors"
                  onClick={(e) => {
                     e.preventDefault();
                     applyStep(val, 'add');
                     setSpeedDial({ open: false, mode: null });
                     skipNextClickRef.current = true;
                  }}
               >
                 + {formatCOP(val)}
               </button>
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
