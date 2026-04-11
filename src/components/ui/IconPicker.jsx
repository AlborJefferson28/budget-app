import { BUDGET_ICON_OPTIONS, IconGlyph, WALLET_ICON_OPTIONS } from '../../lib/icons';

export function IconPicker({ value, onChange, type = 'budget' }) {
  const options = type === 'wallet' ? WALLET_ICON_OPTIONS : BUDGET_ICON_OPTIONS;
  
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Ícono</label>
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all hover:scale-105 ${
              value === option.key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40'
            }`}
            title={option.label}
          >
            <IconGlyph value={option.key} className="h-5 w-5" />
          </button>
        ))}
      </div>
    </div>
  );
}
