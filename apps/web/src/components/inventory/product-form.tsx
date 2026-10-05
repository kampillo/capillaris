'use client';

import { useState } from 'react';
import { Package, Settings2, Boxes } from 'lucide-react';
import { FormIntro, FormActions, useFormDraft, useSaveGuard } from '@/components/clinic/form-layout';
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
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">
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

function ProductSection({ children, inline, id }: { children: React.ReactNode; inline: boolean; id: string }) {
  return <section id={id} className="scroll-mt-24">{inline ? <div className="space-y-5">{children}</div> : <Card className="rounded-xl border-border bg-surface shadow-xs"><CardContent className="space-y-5 p-5 sm:p-6">{children}</CardContent></Card>}</section>;
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
  const [stockUnit, setStockUnit] = useState(defaultValues?.stockUnit ?? '');

  const [error, setError] = useState('');
  const guard = useSaveGuard();
  const busy = !!isSubmitting || guard.saving;
  const dirty = useFormDraft({ name, sku, description, unitPrice, content, unit, stockUnit, isMedicine, requiresPrescription, minStockAlert, initialStock, initialReason });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!name.trim()) {
      setError('El nombre del producto es requerido');
      return;
    }
    try {
      const data: CreateProductData = {
        name: name.trim(),
        sku: sku.trim() || (defaultValues ? null : undefined),
        description: description.trim(),
        unitPrice: unitPrice ? Number(unitPrice) : (defaultValues ? null : undefined),
        content: content ? Number(content) : (defaultValues ? null : undefined),
        unit: unit.trim(),
        stockUnit: stockUnit.trim() || (defaultValues ? null : undefined),
        isMedicine: isMedicine === 'true',
        requiresPrescription: requiresPrescription === 'true',
        minStockAlert: minStockAlert === '' ? 5 : Number(minStockAlert),
      };
      if (showInitialStock && initialStock) {
        const qty = parseInt(initialStock);
        if (qty > 0) {
          data.initialStock = qty;
          data.initialStockReason = initialReason;
        }
      }
      await guard.run(() => onSubmit(data));
    } catch (err: any) {
      setError(err?.message || 'Error al guardar el producto');
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={busy} className="space-y-5" onInvalid={() => setError('Revisa los campos señalados antes de guardar.')}>
      {!inline && <FormIntro title={defaultValues ? 'Editar producto' : 'Nuevo producto'} description="Completa los datos del producto y revisa su clasificación y alertas antes de guardar." sections={[{ id: 'product-data', label: 'Datos' }, { id: 'product-settings', label: 'Clasificación y alertas' }, ...(showInitialStock ? [{ id: 'product-stock', label: 'Stock inicial' }] : [])]} />}
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <fieldset disabled={busy} className="min-w-0 space-y-5">
      <ProductSection inline={inline} id="product-data">
        {!inline && (
          <SectionHeader
            icon={Package}
            title="Información del producto"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="product-name">Nombre <span className="text-destructive">*</span></Label>
            <Input id="product-name"
              required
              placeholder="Ej. Minoxidil 5%"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-sku">SKU</Label>
            <Input id="product-sku"
              placeholder="Ej. MNX-005"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="product-description">Descripción</Label>
          <Textarea id="product-description"
            placeholder="Descripción del producto…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="product-unit-price">Precio unitario</Label>
            <Input id="product-unit-price"
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
            <Label htmlFor="product-content">Contenido</Label>
            <Input id="product-content"
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
            <Label htmlFor="product-unit">Unidad del contenido</Label>
            <Input id="product-unit"
              placeholder="Ej. ml"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="product-stock-unit">Unidad física de stock</Label>
          <Input id="product-stock-unit" value={stockUnit} onChange={e => setStockUnit(e.target.value)} maxLength={30} placeholder="Ej. frasco, caja, pieza" className="h-11" />
          <p className="text-xs text-muted-foreground">Cada unidad corresponde a un envase completo. El contenido en ml o mg se registra aparte. Sin esta unidad validada no se pueden confirmar entregas.</p>
        </div>
      </ProductSection>

      <ProductSection inline={inline} id="product-settings">
        {!inline && (
          <SectionHeader
            icon={Settings2}
            title="Configuración"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="product-is-medicine">Es medicamento</Label>
            <Select disabled={busy} value={isMedicine} onValueChange={setIsMedicine}>
              <SelectTrigger id="product-is-medicine" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No</SelectItem>
                <SelectItem value="true">Sí</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-requires-prescription">Requiere prescripción</Label>
            <Select disabled={busy}
              value={requiresPrescription}
              onValueChange={setRequiresPrescription}
            >
              <SelectTrigger id="product-requires-prescription" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No</SelectItem>
                <SelectItem value="true">Sí</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-min-stock">Alerta stock mínimo</Label>
            <Input id="product-min-stock"
              type="number"
              min="0"
              value={minStockAlert}
              onChange={(e) => setMinStockAlert(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
      </ProductSection>

      {showInitialStock && (
        <ProductSection inline={inline} id="product-stock">
          {!inline && (
            <SectionHeader
              icon={Boxes}
              title="Stock inicial (opcional)"
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-initial-stock">Cantidad inicial</Label>
              <Input id="product-initial-stock"
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
              <Label htmlFor="product-initial-reason">Razón</Label>
              <Select disabled={busy} value={initialReason} onValueChange={setInitialReason}>
                <SelectTrigger id="product-initial-reason" className="h-11">
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
        </ProductSection>
      )}

      </fieldset>
      <FormActions busy={busy} dirty={dirty} submitLabel={submitLabel} onCancel={onCancel} sticky={!inline} />
    </form>
  );
}
