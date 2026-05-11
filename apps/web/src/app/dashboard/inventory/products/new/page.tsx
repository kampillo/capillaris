'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductForm } from '@/components/inventory/product-form';
import { useCreateProduct } from '@/hooks/use-inventory';
import { useRequireRole } from '@/hooks/use-has-role';

export default function NewProductPage() {
  const router = useRouter();
  const createMutation = useCreateProduct();
  const authorized = useRequireRole('admin', 'inventory_manager');
  if (!authorized) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
          <Link href="/dashboard/inventory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nuevo Producto</h2>
          <p className="text-sm text-muted-foreground">
            Registrar un nuevo producto en el inventario
          </p>
        </div>
      </div>

      <div className="max-w-3xl">
        <ProductForm
          showInitialStock
          isSubmitting={createMutation.isPending}
          submitLabel="Crear producto"
          onCancel={() => router.push('/dashboard/inventory')}
          onSubmit={async (data) => {
            await createMutation.mutateAsync(data);
            router.push('/dashboard/inventory');
          }}
        />
      </div>
    </div>
  );
}
