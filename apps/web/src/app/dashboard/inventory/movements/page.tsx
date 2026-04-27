'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  ArrowDown,
  ArrowUp,
  Sliders,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useProducts,
  useAllMovements,
  type StockMovement,
} from '@/hooks/use-inventory';
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

export default function StockMovementsPage() {
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');

  const { data: movementsData, isLoading } = useAllMovements(page, 30);
  const { data: productsData } = useProducts(1, 200);

  const movements = movementsData?.data || [];
  const meta = movementsData?.meta;
  const products = productsData?.data || [];
  const selectedProduct = products.find((p) => p.id === selectedProductId);

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
            <h2 className="text-2xl font-bold tracking-tight">
              Movimientos de Stock
            </h2>
            <p className="text-sm text-muted-foreground">
              Historial completo de entradas, salidas y ajustes
            </p>
          </div>
        </div>
        <Button
          className="h-10 font-medium shadow-sm"
          onClick={() => {
            setSelectedProductId('');
            setShowNew(true);
          }}
        >
          Nuevo Movimiento
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Cargando…</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No hay movimientos registrados
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Fecha
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Producto
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Movimiento
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Razón
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Notas
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id} className="hover:bg-accent/50 transition-colors">
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(m.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {m.product?.id ? (
                        <Link
                          href={`/dashboard/inventory/products/${m.product.id}`}
                          className="hover:underline"
                        >
                          {m.product.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <MovementBadge m={m} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {REASON_LABELS[m.reason] ?? m.reason}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                      {m.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Página {meta.page} de {meta.totalPages} ({meta.total} movimientos)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* New Movement Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className={cn('sm:max-w-md')}>
          <DialogHeader>
            <DialogTitle>Nuevo movimiento de stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Producto <span className="text-destructive">*</span>
              </label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProductId && (
              <StockMovementForm
                productId={selectedProductId}
                productName={selectedProduct?.name}
                onCancel={() => setShowNew(false)}
                onDone={() => setShowNew(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
