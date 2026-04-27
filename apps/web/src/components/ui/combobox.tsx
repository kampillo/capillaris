'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface ComboboxOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  /** Current text value (free-form). */
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  /** Called when the user picks an option from the list. */
  onOptionSelect?: (option: ComboboxOption) => void;
  /** ID of the currently selected option, if any (for the check icon). */
  selectedId?: string;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  /** Min characters before showing suggestions. Default: 1 */
  minChars?: number;
}

export function Combobox({
  value,
  onValueChange,
  options,
  onOptionSelect,
  selectedId,
  placeholder,
  emptyMessage = 'Sin coincidencias',
  className,
  inputClassName,
  disabled,
  minChars = 1,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length === 0) {
      return minChars === 0 ? options.slice(0, 50) : [];
    }
    return options
      .filter((o) => o.label.toLowerCase().includes(q))
      .slice(0, 12);
  }, [value, options, minChars]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (opt: ComboboxOption) => {
    onValueChange(opt.label);
    onOptionSelect?.(opt);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('pr-8', inputClassName)}
          autoComplete="off"
        />
        <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
      {open && (value.trim().length >= minChars || minChars === 0) && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <ul className="max-h-60 overflow-y-auto py-1">
              {filtered.map((opt) => {
                const isSelected = opt.id === selectedId;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                        isSelected && 'bg-accent/60',
                      )}
                    >
                      <span className="flex flex-col">
                        <span className="font-medium">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[11px] text-muted-foreground">
                            {opt.sublabel}
                          </span>
                        )}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
