import Link from '@/components/patients/patient-context-link';

// Existing import path retained; assignments remain in storage as history only.
export function NursingAssignments({ patientId }: { patientId: string }) {
  return <section className="rounded-lg border bg-surface p-5 space-y-3">
    <h3 className="font-semibold">Áreas de captura</h3>
    <p className="text-sm text-text-secondary">Enfermería quirúrgica accede a los formularios sin asignación individual. Los participantes se registran en cada reporte diario, por separado de quién captura.</p>
    <Link className="block min-h-11 py-3 text-sm underline" href={`/dashboard/nursing/${patientId}`}>Procedimientos y participantes →</Link>
    <Link className="block min-h-11 py-3 text-sm underline" href={`/dashboard/treatment-care/${patientId}`}>Historial y captura de tratamientos →</Link>
  </section>;
}
