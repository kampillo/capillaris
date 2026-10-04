'use client';

import { useState } from 'react';
import { FormActions, useFormDraft, useSaveGuard } from '@/components/clinic/form-layout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateStockMovement,
  type CreateStockMovementData,
} from '@/hooks/use-inventory';

interface StockMovementFormProps {
  productId: string;
  productName?: string;
  /** Restrict to one direction (for "+ Stock" button = "entrada"). */
  defaultMovementType?: 'entrada' | 'salida' | 'ajuste';
  lockMovementType?: boolean;
  onDone?: () => void;
  onCancel?: () => void;
  onSavingChange?: (saving: boolean) => void;
}

const ENTRY_REASONS = [
  { value: 'compra', label: 'Compra' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'ajuste_manual', label: 'Ajuste manual' },
];
const EXIT_REASONS = [
  { value: 'prescripcion', label: 'Prescripción' },
  { value: 'procedimiento', label: 'Procedimiento' },
  { value: 'merma', label: 'Merma' },
  { value: 'ajuste_manual', label: 'Ajuste manual' },
];

export function StockMovementForm({
  productId,
  productName,
  defaultMovementType = 'entrada',
  lockMovementType = false,
  onDone,
  onCancel,
  onSavingChange,
}: StockMovementFormProps) {
  const [movementType, setMovementType] = useState(defaultMovementType);
  const [reason, setReason] = useState(
    defaultMovementType === 'salida' ? 'prescripcion' : 'compra',
  );
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const createMovement = useCreateStockMovement();
  const guard = useSaveGuard();
  const busy = createMovement.isPending || guard.saving;
  const dirty = useFormDraft({ movementType, reason, quantity, notes });

  const reasons =
    movementType === 'salida' ? EXIT_REASONS : ENTRY_REASONS;

  const handleTypeChange = (v: string) => {
    setMovementType(v as 'entrada' | 'salida' | 'ajuste');
    setReason(v === 'salida' ? 'prescripcion' : 'compra');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      setError('Cantidad debe ser un entero mayor a 0');
      return;
    }
    try {
      const payload: CreateStockMovementData = {
        productId,
        movementType,
        reason,
        quantity: qty,
        notes: notes.trim() || undefined,
      };
      await guard.run(async () => {
        onSavingChange?.(true);
        try { await createMovement.mutateAsync(payload); onDone?.(); }
        finally { onSavingChange?.(false); }
      });
    } catch (err: any) {
      setError(err?.message || 'Error al registrar movimiento');
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={busy} className="space-y-4">
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {productName && (
        <div className="rounded-lg border bg-accent/30 p-3 text-sm">
          <span className="text-muted-foreground">Producto: </span>
          <span className="font-medium">{productName}</span>
        </div>
      )}

      <fieldset disabled={busy} className="min-w-0 space-y-4">
      {!lockMovementType && (
        <div className="space-y-1.5">
          <Label htmlFor="stock-type">Tipo de movimiento</Label>
          <Select disabled={busy} value={movementType} onValueChange={handleTypeChange}>
            <SelectTrigger id="stock-type" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="salida">Salida</SelectItem>

            </SelectContent>
          </Select>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Para corregir existencias usa Entrada o Salida y la razón Ajuste manual. La cantidad indica cuánto agregar o retirar.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="stock-quantity">Cantidad <span className="text-destructive">*</span></Label>
          <Input
            id="stock-quantity" required step={1}
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Cantidad"
            className="h-11"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock-reason">Razón</Label>
          <Select disabled={busy} value={reason} onValueChange={setReason}>
            <SelectTrigger id="stock-reason" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reasons.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="stock-notes">Notas</Label>
        <Input
          id="stock-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas opcionales…"
          className="h-11"
        />
      </div>

      </fieldset>
      <FormActions busy={busy} dirty={dirty} submitLabel="Registrar" onCancel={onCancel} />
    </form>
  );
}
