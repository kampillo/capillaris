export const PATIENTS_PATH = '/dashboard/patients';
const filters = ['all', 'active', 'evaluation', 'registered', 'lead', 'inactive', 'archived'] as const;
const sortFields = ['name', 'tipoPaciente', 'origenCanal', 'updatedAt', 'createdAt'] as const;
export type PatientListState = {
  query: string;
  filter: typeof filters[number];
  page: number;
  sortBy: typeof sortFields[number];
  sortOrder: 'asc' | 'desc';
};
type SearchValues = { get: (key: string) => string | null };

export function readPatientListState(params: SearchValues): PatientListState {
  const filter = params.get('tipoPaciente');
  const sortBy = params.get('sortBy');
  const rawPage = params.get('page') ?? '1';
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  return {
    query: params.get('query') ?? '',
    filter: filters.includes(filter as PatientListState['filter']) ? filter as PatientListState['filter'] : 'all',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    sortBy: sortFields.includes(sortBy as PatientListState['sortBy']) ? sortBy as PatientListState['sortBy'] : 'createdAt',
    sortOrder: params.get('sortOrder') === 'asc' ? 'asc' : 'desc',
  };
}

export function patientListHref(state: PatientListState): string {
  const params = new URLSearchParams();
  if (state.query) params.set('query', state.query);
  if (state.filter !== 'all') params.set('tipoPaciente', state.filter);
  if (state.page !== 1) params.set('page', String(state.page));
  if (state.sortBy !== 'createdAt') params.set('sortBy', state.sortBy);
  if (state.sortOrder !== 'desc') params.set('sortOrder', state.sortOrder);
  const query = params.toString();
  return query ? `${PATIENTS_PATH}?${query}` : PATIENTS_PATH;
}

/** Return destinations accept only the patient list and its known filters. */
export function safePatientListReturn(value: string | null | undefined): string {
  if (!value || /[\u0000-\u001f\u007f\\#]/.test(value)) return PATIENTS_PATH;
  const separator = value.indexOf('?');
  const path = separator === -1 ? value : value.slice(0, separator);
  const query = separator === -1 ? '' : value.slice(separator + 1);
  if (path !== PATIENTS_PATH) return PATIENTS_PATH;
  return patientListHref(readPatientListState(new URLSearchParams(query)));
}

export function patientContextHref(href: string, returnTo: string | null | undefined): string {
  const safeReturn = safePatientListReturn(returnTo);
  if (href === PATIENTS_PATH) return safeReturn;
  const separator = href.indexOf('?');
  const path = separator === -1 ? href : href.slice(0, separator);
  const query = separator === -1 ? '' : href.slice(separator + 1);
  if (!/^\/dashboard\/(?:patients|nursing|treatment-care)\/[0-9a-f-]{36}(?:\/[a-z-]+)*$/i.test(path)) return href;
  const params = new URLSearchParams(query);
  params.set('returnTo', safeReturn);
  return `${path}?${params.toString()}`;
}
