'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
}: StockMovementFormProps) {
  const [movementType, setMovementType] = useState(defaultMovementType);
  const [reason, setReason] = useState(
    defaultMovementType === 'salida' ? 'prescripcion' : 'compra',
  );
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const createMovement = useCreateStockMovement();

  const reasons =
    movementType === 'salida' ? EXIT_REASONS : ENTRY_REASONS;

  const handleTypeChange = (v: string) => {
    setMovementType(v as 'entrada' | 'salida' | 'ajuste');
    setReason(v === 'salida' ? 'prescripcion' : 'compra');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const qty = parseInt(quantity);
    if (!qty || qty < 1) {
      setError('Cantidad debe ser mayor a 0');
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
      await createMovement.mutateAsync(payload);
      onDone?.();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar movimiento');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {productName && (
        <div className="rounded-lg border bg-accent/30 p-3 text-sm">
          <span className="text-muted-foreground">Producto: </span>
          <span className="font-medium">{productName}</span>
        </div>
      )}

      {!lockMovementType && (
        <div className="space-y-1.5">
          <Label>Tipo de movimiento</Label>
          <Select value={movementType} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="salida">Salida</SelectItem>
              <SelectItem value="ajuste">Ajuste</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Cantidad <span className="text-destructive">*</span></Label>
          <Input
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
          <Label>Razón</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="h-11">
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
        <Label>Notas</Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas opcionales…"
          className="h-11"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={createMovement.isPending}>
          {createMovement.isPending ? 'Registrando…' : 'Registrar'}
        </Button>
      </div>
    </form>
  );
}
