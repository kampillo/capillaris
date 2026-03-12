'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
          <h2 className="text-3xl font-bold tracking-tight">Inventario</h2>
          <p className="text-muted-foreground">
            {meta ? `${meta.total} productos registrados` : 'Gestión de inventario y productos'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/inventory/movements">
              Movimientos
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/inventory/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Link>
          </Button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm">
              <strong>{lowStockCount} producto{lowStockCount !== 1 ? 's' : ''}</strong> con stock bajo o agotado
            </p>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando productos...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-destructive">Error al cargar productos</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Package className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No se encontraron productos</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const stock = product.stockBalance?.currentQuantity ?? 0;
                  const isLow = stock <= product.minStockAlert;
                  return (
                    <TableRow key={product.id}>
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
                          <Badge variant="secondary">Medicamento</Badge>
                        ) : (
                          <Badge variant="outline">Producto</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
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
            <p className="text-sm text-muted-foreground">
              Página {meta.page} de {meta.totalPages} ({meta.total} resultados)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar Producto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas desactivar <strong>{deleteTarget?.name}</strong>?
              El producto no se eliminará, solo se marcará como inactivo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
