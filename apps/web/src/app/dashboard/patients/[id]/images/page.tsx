 'use client';
import Link from '@/components/patients/patient-context-link';
import { usePatient } from '@/hooks/use-patients';
import { useHasRole, useRequireRole } from '@/hooks/use-has-role';
import { normalizeDriveFolderUrl } from '@capillaris/shared';
import { Button } from '@/components/ui/button';
export default function PatientDrivePage({ params }: { params: { id: string } }) {
  const allowed = useRequireRole('admin', 'doctor', 'receptionist');
  const canEdit = useHasRole('admin', 'doctor', 'receptionist');
  const { data: patient, isLoading, error } = usePatient(params.id);
  if (!allowed) return null;
  let folder: string | null = null;
  try { folder = normalizeDriveFolderUrl(patient?.driveFolderUrl); } catch { /* malformed legacy link cannot be opened */ }
  return <div className="space-y-4">
    <Link href={`/dashboard/patients/${params.id}`} className="text-sm underline">Volver al paciente</Link>
    <h2 className="cap-h2">Fotos en Google Drive</h2>
    {isLoading ? <p>Cargando carpeta…</p> : error ? <p role="alert" className="text-destructive">No se pudo cargar el enlace de la carpeta.</p> : <>
      <p>{patient?.nombre} {patient?.apellido}</p>
      <p className="text-sm text-text-secondary">Usa tu cuenta de Google. El acceso depende de los permisos existentes de la carpeta.</p>
      {folder ? <Button asChild><a href={folder} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Abrir carpeta de fotos</a></Button> : <p>No hay una carpeta vinculada.</p>}
      {canEdit && <Button variant="outline" asChild><Link href={`/dashboard/patients/${params.id}/edit`}>Editar enlace de Drive</Link></Button>}
    </>}
  </div>;
}
