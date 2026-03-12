'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

const MOVEMENT_TYPE_LABELS: Record<string, { label: string; icon: typeof ArrowDownToLine }> = {
  entrada: { label: 'Entrada', icon: ArrowDownToLine },
  salida: { label: 'Salida', icon: ArrowUpFromLine },
  ajuste: { label: 'Ajuste', icon: Settings2 },
};

const REASON_LABELS: Record<string, string> = {
  compra: 'Compra',
  prescripcion: 'Prescripción',
  procedimiento: 'Procedimiento',
  ajuste_manual: 'Ajuste manual',
  merma: 'Merma',
  devolucion: 'Devolución',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Movimientos de Stock</h2>
            <p className="text-muted-foreground">Registro de entradas, salidas y ajustes</p>
          </div>
        </div>
        <Button onClick={() => setShowNew(true)}>
          Nuevo Movimiento
        </Button>
      </div>

      {/* Current Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Actual</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          ) : balances.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No hay datos de inventario</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock Actual</TableHead>
                  <TableHead>Alerta Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((b) => {
                  const isLow = b.currentQuantity <= (b.product?.minStockAlert ?? 5);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.product?.name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{b.product?.sku ?? '—'}</TableCell>
                      <TableCell className={isLow ? 'text-destructive font-medium' : ''}>
                        {b.currentQuantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{b.product?.minStockAlert ?? 5}</TableCell>
                      <TableCell>
                        {isLow ? (
                          <Badge variant="destructive">Bajo</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento de Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label>Producto *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="salida">Salida</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Razón</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Cantidad *</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Cantidad"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas opcionales..."
              />
            </div>
          </div>
          <DialogFooter>
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
