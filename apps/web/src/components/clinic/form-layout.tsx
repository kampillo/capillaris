'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export function useFormDraft(value: unknown) {
  const initial = useRef(JSON.stringify(value));
  return JSON.stringify(value) !== initial.current;
}

/** Lock immediately, including the interval before the mutation rerenders. */
export function useSaveGuard() {
  const locked = useRef(false);
  const [saving, setSaving] = useState(false);
  const run = async (save: () => Promise<unknown> | unknown) => {
    if (locked.current) return;
    locked.current = true;
    setSaving(true);
    try { await save(); } finally { locked.current = false; setSaving(false); }
  };
  return { saving, run };
}

export function FormIntro({ title, description, sections }: { title: string; description: string; sections: { id: string; label: string }[] }) {
  return <header className="space-y-4 rounded-xl border border-brand/20 bg-brand-softer p-5 sm:p-6">
    <div><h2 className="cap-h2">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{description}</p></div>
    <nav aria-label="Secciones del formulario" className="flex flex-wrap gap-2">{sections.map(section => <a key={section.id} href={`#${section.id}`} className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">{section.label}</a>)}</nav>
  </header>;
}

export function FormActions({ busy, dirty, submitLabel, onCancel, disabled = false, sticky = true }: { busy: boolean; dirty: boolean; submitLabel: string; onCancel?: () => void; disabled?: boolean; sticky?: boolean }) {
  return <footer className={`${sticky ? 'sticky bottom-3 z-10 ' : ''}flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-md`}>
    <p role="status" aria-live="polite" className="text-sm text-text-secondary">{busy ? 'Guardando…' : dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}</p>
    <div className="flex flex-wrap gap-2">{onCancel && <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancelar</Button>}<Button type="submit" disabled={busy || disabled}>{busy ? 'Guardando…' : submitLabel}</Button></div>
  </footer>;
}

export function QueryFeedback({ loading, error, onRetry, label }: { loading?: boolean; error?: boolean; onRetry?: () => void; label: string }) {
  if (error) return <div role="alert" className="space-y-3 rounded-xl border border-destructive/20 bg-surface p-5 text-sm text-destructive"><p>No se pudo cargar: {label}. Los datos no están disponibles.</p>{onRetry && <Button type="button" variant="outline" onClick={onRetry}>Reintentar</Button>}</div>;
  if (loading) return <p role="status" className="rounded-xl border border-border bg-surface p-5 text-sm text-text-secondary">Cargando {label}…</p>;
  return null;
}
