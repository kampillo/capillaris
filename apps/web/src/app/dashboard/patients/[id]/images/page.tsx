export default function PatientImagesPage({
  params,
}: {
  params: { id: string };
}) {
  // TODO: implement image gallery with upload, categories, and before/after comparison
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Imágenes</h2>
        <p className="text-muted-foreground">
          Imágenes del paciente #{params.id}
        </p>
      </div>
    </div>
  );
}
