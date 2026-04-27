'use client';

import { useState } from 'react';
import { Package, Settings2, Boxes, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreateProductData, Product } from '@/hooks/use-inventory';

function SectionHeader({
  icon: Icon,
  title,
  iconBg,
  iconColor,
}: {
  icon: typeof Package;
  title: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconBg)}>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
    </div>
  );
}

interface ProductFormProps {
  defaultValues?: Partial<Product>;
  /** Show "Stock inicial" section (only on create) */
  showInitialStock?: boolean;
  onSubmit: (data: CreateProductData) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  /** Render without surrounding cards (for use inside dialogs) */
  inline?: boolean;
}

export function ProductForm({
  defaultValues,
  showInitialStock = false,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = 'Guardar',
  inline = false,
}: ProductFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? '');
  const [sku, setSku] = useState(defaultValues?.sku ?? '');
  const [description, setDescription] = useState(defaultValues?.description ?? '');
  const [unitPrice, setUnitPrice] = useState(
    defaultValues?.unitPrice != null ? String(defaultValues.unitPrice) : '',
  );
  const [content, setContent] = useState(
    defaultValues?.content != null ? String(defaultValues.content) : '',
  );
  const [unit, setUnit] = useState(defaultValues?.unit ?? '');
  const [isMedicine, setIsMedicine] = useState(
    defaultValues?.isMedicine ? 'true' : 'false',
  );
  const [requiresPrescription, setRequiresPrescription] = useState(
    defaultValues?.requiresPrescription ? 'true' : 'false',
  );
  const [minStockAlert, setMinStockAlert] = useState(
    defaultValues?.minStockAlert != null ? String(defaultValues.minStockAlert) : '5',
  );

  const [initialStock, setInitialStock] = useState('');
  const [initialReason, setInitialReason] = useState('compra');

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('El nombre del producto es requerido');
      return;
    }
    try {
      const data: CreateProductData = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        description: description.trim() || undefined,
        unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
        content: content ? parseFloat(content) : undefined,
        unit: unit.trim() || undefined,
        isMedicine: isMedicine === 'true',
        requiresPrescription: requiresPrescription === 'true',
        minStockAlert: parseInt(minStockAlert) || 5,
      };
      if (showInitialStock && initialStock) {
        const qty = parseInt(initialStock);
        if (qty > 0) {
          data.initialStock = qty;
          data.initialStockReason = initialReason;
        }
      }
      await onSubmit(data);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar el producto');
    }
  };

  const Wrapper = inline
    ? ({ children }: { children: React.ReactNode }) => (
        <div className="space-y-4">{children}</div>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <Card className="shadow-sm">
          <CardContent className="space-y-4 pt-5">{children}</CardContent>
        </Card>
      );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Wrapper>
        {!inline && (
          <SectionHeader
            icon={Package}
            title="Información del producto"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Ej. Minoxidil 5%"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>SKU</Label>
            <Input
              placeholder="Ej. MNX-005"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Textarea
            placeholder="Descripción del producto…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Precio unitario</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contenido</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej. 60"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unidad</Label>
            <Input
              placeholder="Ej. ml"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
      </Wrapper>

      <Wrapper>
        {!inline && (
          <SectionHeader
            icon={Settings2}
            title="Configuración"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
        )}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Es medicamento</Label>
            <Select value={isMedicine} onValueChange={setIsMedicine}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No</SelectItem>
                <SelectItem value="true">Sí</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Requiere prescripción</Label>
            <Select
              value={requiresPrescription}
              onValueChange={setRequiresPrescription}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No</SelectItem>
                <SelectItem value="true">Sí</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Alerta stock mínimo</Label>
            <Input
              type="number"
              min="0"
              value={minStockAlert}
              onChange={(e) => setMinStockAlert(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
      </Wrapper>

      {showInitialStock && (
        <Wrapper>
          {!inline && (
            <SectionHeader
              icon={Boxes}
              title="Stock inicial (opcional)"
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cantidad inicial</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ej. 10"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="h-11"
              />
              <p className="text-[11px] text-muted-foreground">
                Si lo llenas, se registrará automáticamente como una entrada.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Razón</Label>
              <Select value={initialReason} onValueChange={setInitialReason}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="ajuste_manual">Ajuste manual</SelectItem>
                  <SelectItem value="devolucion">Devolución</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Wrapper>
      )}

      <div className="flex gap-3 pt-1">
        <Button
          type="submit"
          className="h-11 px-8 font-medium"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando…' : submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={onCancel}
          >
            <X className="mr-1 h-4 w-4" />
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
