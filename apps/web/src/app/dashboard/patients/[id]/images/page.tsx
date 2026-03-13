'use client';

import Link from 'next/link';
import { ArrowLeft, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

export default function PatientImagesPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" asChild>
          <Link href={`/dashboard/patients/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Imágenes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Galería de imágenes del paciente
          </p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">La galería de imágenes estará disponible próximamente</p>
          <p className="text-xs text-muted-foreground">Subida de fotos, categorías y comparación antes/después</p>
        </CardContent>
      </Card>
    </div>
  );
}
