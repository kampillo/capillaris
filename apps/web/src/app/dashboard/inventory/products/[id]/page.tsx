'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  PackagePlus,
  PackageMinus,
  Trash2,
  Package,
  ArrowDown,
  ArrowUp,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useProduct,
  useUpdateProduct,
  useDeleteProduct,
  useStockMovements,
  type StockMovement,
} from '@/hooks/use-inventory';
import { ProductForm } from '@/components/inventory/product-form';
import { StockMovementForm } from '@/components/inventory/stock-movement-form';

const REASON_LABELS: Record<string, string> = {
  compra: 'Compra',
  prescripcion: 'Prescripción',
  procedimiento: 'Procedimiento',
  ajuste_manual: 'Ajuste manual',
  merma: 'Merma',
  devolucion: 'Devolución',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MovementBadge({ m }: { m: StockMovement }) {
  if (m.movementType === 'entrada') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <ArrowDown className="h-3 w-3" /> +{m.quantity}
      </span>
    );
  }
  if (m.movementType === 'salida') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
        <ArrowUp className="h-3 w-3" /> -{m.quantity}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
      <Sliders className="h-3 w-3" /> {m.quantity}
    </span>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';

  const { data: product, isLoading, error } = useProduct(id);
  const { data: movementsData } = useStockMovements(id, 1, 50);
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [editOpen, setEditOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState<'entrada' | 'salida' | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Cargando producto…</p>
      </div>
    );
  }
  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-sm text-destructive">No se pudo cargar el producto</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/inventory">Volver al inventario</Link>
        </Button>
      </div>
    );
  }

  const stock = product.stockBalance?.currentQuantity ?? 0;
  const isLow = stock <= product.minStockAlert;
  const movements = movementsData?.data || [];

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(product.id);
    router.push('/dashboard/inventory');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
            <Link href="/dashboard/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{product.name}</h2>
              {product.isMedicine && (
                <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                  Medicamento
                </span>
              )}
              {!product.isActive && (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Inactivo
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {product.sku ? `SKU: ${product.sku}` : 'Sin SKU'}
              {product.category?.name && ` · ${product.category.name}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStockOpen('entrada')}>
            <PackagePlus className="mr-2 h-4 w-4" /> Agregar stock
          </Button>
          <Button variant="outline" onClick={() => setStockOpen('salida')}>
            <PackageMinus className="mr-2 h-4 w-4" /> Sacar stock
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
          {product.isActive && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Desactivar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Stock card */}
        <Card className="shadow-sm">
          <CardContent className="space-y-4 pt-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Stock actual
              </h3>
            </div>
            <div>
              <div
                className={cn(
                  'text-4xl font-bold tabular-nums',
                  isLow ? 'text-destructive' : 'text-foreground',
                )}
              >
                {stock}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Alerta a partir de {product.minStockAlert} unidades
              </div>
            </div>
            <div className="space-y-2 border-t pt-3 text-xs">
              <DataRow label="Precio unitario">
                {product.unitPrice ? `$${Number(product.unitPrice).toFixed(2)}` : '—'}
              </DataRow>
              <DataRow label="Contenido">
                {product.content && product.unit
                  ? `${product.content} ${product.unit}`
                  : product.content
                    ? String(product.content)
                    : '—'}
              </DataRow>
              <DataRow label="Requiere prescripción">
                {product.requiresPrescription ? 'Sí' : 'No'}
              </DataRow>
            </div>
            {product.description && (
              <div className="border-t pt-3 text-xs text-muted-foreground">
                {product.description}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Movements */}
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <Sliders className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Historial de movimientos
                </h3>
                <span className="text-xs text-muted-foreground">
                  ({movements.length})
                </span>
              </div>
            </div>
            {movements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin movimientos registrados
              </p>
            ) : (
              <div className="divide-y">
                {movements.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <MovementBadge m={m} />
                      <div>
                        <div className="font-medium">
                          {REASON_LABELS[m.reason] ?? m.reason}
                        </div>
                        {m.notes && (
                          <div className="text-xs text-muted-foreground">
                            {m.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(m.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
          </DialogHeader>
          <ProductForm
            inline
            defaultValues={product}
            isSubmitting={updateMutation.isPending}
            submitLabel="Guardar cambios"
            onCancel={() => setEditOpen(false)}
            onSubmit={async (data) => {
              await updateMutation.mutateAsync({ id: product.id, data });
              setEditOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Stock Dialog */}
      <Dialog
        open={stockOpen !== null}
        onOpenChange={(open) => !open && setStockOpen(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {stockOpen === 'entrada' ? 'Agregar stock' : 'Sacar stock'}
            </DialogTitle>
            <DialogDescription>
              Stock actual: <strong>{stock}</strong>
            </DialogDescription>
          </DialogHeader>
          {stockOpen && (
            <StockMovementForm
              productId={product.id}
              productName={product.name}
              defaultMovementType={stockOpen}
              lockMovementType
              onCancel={() => setStockOpen(null)}
              onDone={() => setStockOpen(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar producto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas desactivar{' '}
              <strong>{product.name}</strong>? El producto no se eliminará, solo se
              marcará como inactivo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Desactivando…' : 'Desactivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  );
}
