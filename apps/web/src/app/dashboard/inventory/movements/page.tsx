'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Settings2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
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
  DialogFooter,
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
  useCreateStockMovement,
} from '@/hooks/use-inventory';
import { useInventoryBalances } from '@/hooks/use-inventory';

export default function StockMovementsPage() {
  const [showNew, setShowNew] = useState(false);
  const [productId, setProductId] = useState('');
  const [movementType, setMovementType] = useState('entrada');
  const [reason, setReason] = useState('compra');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data: inventoryData, isLoading } = useInventoryBalances(1, 100);
  const { data: productsData } = useProducts(1, 100);
  const createMovement = useCreateStockMovement();

  const balances = inventoryData?.data || [];
  const products = productsData?.data || [];

  const handleSubmit = async () => {
    setError('');
    if (!productId || !quantity) {
      setError('Producto y cantidad son requeridos');
      return;
    }
    try {
      await createMovement.mutateAsync({
        productId,
        movementType,
        reason,
        quantity: parseInt(quantity),
        notes: notes || undefined,
      });
      setShowNew(false);
      setProductId('');
      setQuantity('');
      setNotes('');
    } catch (err: any) {
      setError(err?.message || 'Error al registrar movimiento');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" asChild>
            <Link href="/dashboard/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Movimientos de Stock</h2>
            <p className="text-sm text-muted-foreground">Registro de entradas, salidas y ajustes</p>
          </div>
        </div>
        <Button className="h-10 font-medium shadow-sm" onClick={() => setShowNew(true)}>
          Nuevo Movimiento
        </Button>
      </div>

      {/* Current Balances */}
      <Card className="shadow-sm">
        <CardContent className="pt-5 pb-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Stock Actual</h3>
        </CardContent>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          ) : balances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No hay datos de inventario</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Producto</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">SKU</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Stock Actual</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Alerta Mínimo</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((b) => {
                  const isLow = b.currentQuantity <= (b.product?.minStockAlert ?? 5);
                  return (
                    <TableRow key={b.id} className="hover:bg-accent/50 transition-colors">
                      <TableCell className="font-medium">{b.product?.name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{b.product?.sku ?? '—'}</TableCell>
                      <TableCell className={isLow ? 'text-destructive font-medium' : ''}>
                        {b.currentQuantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{b.product?.minStockAlert ?? 5}</TableCell>
                      <TableCell>
                        {isLow ? (
                          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600 border-red-200">
                            Bajo
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                            OK
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Movement Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento de Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Producto <span className="text-destructive">*</span></Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={movementType} onValueChange={setMovementType}>
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
              <div className="space-y-1.5">
                <Label>Razón</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compra">Compra</SelectItem>
                    <SelectItem value="prescripcion">Prescripción</SelectItem>
                    <SelectItem value="procedimiento">Procedimiento</SelectItem>
                    <SelectItem value="ajuste_manual">Ajuste manual</SelectItem>
                    <SelectItem value="merma">Merma</SelectItem>
                    <SelectItem value="devolucion">Devolución</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cantidad <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Cantidad"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas opcionales..."
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMovement.isPending}>
              {createMovement.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
