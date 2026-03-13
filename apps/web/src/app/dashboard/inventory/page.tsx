'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight, AlertTriangle, Package, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProducts, useDeleteProduct, type Product } from '@/hooks/use-inventory';
import { useLowStock } from '@/hooks/use-inventory';

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data, isLoading, error } = useProducts(page, 20);
  const { data: lowStock } = useLowStock();
  const deleteMutation = useDeleteProduct();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const products = data?.data || [];
  const meta = data?.meta;
  const lowStockCount = lowStock?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventario</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta ? `${meta.total} productos registrados` : 'Gestión de inventario y productos'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10" asChild>
            <Link href="/dashboard/inventory/movements">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Movimientos
            </Link>
          </Button>
          <Button className="h-10 font-medium shadow-sm" asChild>
            <Link href="/dashboard/inventory/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Link>
          </Button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm">
              <strong>{lowStockCount} producto{lowStockCount !== 1 ? 's' : ''}</strong> con stock bajo o agotado
            </p>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Cargando productos...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-destructive">Error al cargar productos</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No se encontraron productos</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Producto</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">SKU</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Categoría</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Precio</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Stock</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Tipo</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const stock = product.stockBalance?.currentQuantity ?? 0;
                  const isLow = stock <= product.minStockAlert;
                  return (
                    <TableRow key={product.id} className="hover:bg-accent/50 transition-colors">
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.sku || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.category?.name || '—'}
                      </TableCell>
                      <TableCell>
                        {product.unitPrice ? `$${Number(product.unitPrice).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={isLow ? 'text-destructive font-medium' : ''}>
                          {stock}
                        </span>
                        {isLow && <AlertTriangle className="inline ml-1 h-3 w-3 text-destructive" />}
                      </TableCell>
                      <TableCell>
                        {product.isMedicine ? (
                          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-700 border-violet-200">
                            Medicamento
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-slate-50 text-slate-600 border-slate-200">
                            Producto
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(product)}
                        >
                          Desactivar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              Página {meta.page} de {meta.totalPages} ({meta.total} resultados)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button variant="outline" size="sm" className="h-8" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar Producto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas desactivar <strong>{deleteTarget?.name}</strong>?
              El producto no se eliminará, solo se marcará como inactivo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Desactivando...' : 'Desactivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
