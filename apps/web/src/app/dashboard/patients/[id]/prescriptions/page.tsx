export default function PatientPrescriptionsPage({
  params,
}: {
  params: { id: string };
}) {
  // TODO: implement patient prescriptions list and management
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Prescripciones</h2>
        <p className="text-muted-foreground">
          Prescripciones del paciente #{params.id}
        </p>
      </div>
    </div>
  );
}
