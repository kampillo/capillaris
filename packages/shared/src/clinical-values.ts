export interface FollicleInputs {
  totalFoliculos?: number | null;
  cb1?: number | null; cb2?: number | null; cb3?: number | null; cb4?: number | null;
}

export function procedureTotals(row: FollicleInputs) {
  const counts = [row.cb1, row.cb2, row.cb3, row.cb4];
  const hasCounts = counts.some(value => value != null);
  const countedFollicles = hasCounts ? counts.reduce<number>((sum, n) => sum + (n ?? 0), 0) : null;
  const hairs = hasCounts ? counts.reduce<number>((sum, n, i) => sum + (n ?? 0) * (i + 1), 0) : null;
  return {
    follicles: row.totalFoliculos ?? countedFollicles,
    hairs,
    coefficient: countedFollicles != null && countedFollicles > 0 ? hairs! / countedFollicles : null,
    source: row.totalFoliculos != null ? 'manual' as const : hasCounts ? 'cb' as const : null,
  };
}

/** No Drive API call: retaining a link never modifies folder permissions. */
export function normalizeDriveFolderUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com' || url.port || url.username || url.password) {
    throw new Error('Usa el enlace HTTPS de una carpeta de Google Drive');
  }
  const match = url.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)\/?$/);
  if (!match) throw new Error('El enlace debe corresponder a una carpeta de Google Drive');
  const canonical = new URL(`https://drive.google.com/drive/folders/${match[1]}`);
  // Some existing shared folders need this key. Dropping it would change access.
  const resourcekey = url.searchParams.get('resourcekey');
  if (resourcekey) canonical.searchParams.set('resourcekey', resourcekey);
  return canonical.toString();
}
