'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useCreateProduct } from '@/hooks/use-inventory';

export default function NewProductPage() {
  const router = useRouter();
  const createMutation = useCreateProduct();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [content, setContent] = useState('');
  const [unit, setUnit] = useState('');
  const [isMedicine, setIsMedicine] = useState('false');
  const [requiresPrescription, setRequiresPrescription] = useState('false');
  const [minStockAlert, setMinStockAlert] = useState('5');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre del producto es requerido');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        sku: sku.trim() || undefined,
        description: description.trim() || undefined,
        unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
        content: content ? parseFloat(content) : undefined,
        unit: unit.trim() || undefined,
        isMedicine: isMedicine === 'true',
        requiresPrescription: requiresPrescription === 'true',
        minStockAlert: parseInt(minStockAlert) || 5,
      });
      router.push('/dashboard/inventory');
    } catch (err: any) {
      setError(err?.message || 'Error al crear el producto');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" asChild>
          <Link href="/dashboard/inventory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nuevo Producto</h2>
          <p className="text-sm text-muted-foreground">Registrar un nuevo producto en el inventario</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 max-w-2xl">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Información del Producto</h3>
              </div>
              <div className="space-y-4">
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
                    placeholder="Descripción del producto..."
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
                      placeholder="Ej. ml, unidades"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                  <Settings2 className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Configuración</h3>
              </div>
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
                  <Select value={requiresPrescription} onValueChange={setRequiresPrescription}>
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
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="h-11 px-8 font-medium" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Producto'}
            </Button>
            <Button type="button" variant="outline" className="h-11" asChild>
              <Link href="/dashboard/inventory">Cancelar</Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
