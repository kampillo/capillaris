import { AsyncLocalStorage } from 'async_hooks';
import type { Prisma } from '@prisma/client';
import { maskSensitive } from './sensitive-fields';

// Clinical aggregates only. Related patient/user/product profiles are not
// part of an edit to the history or prescription being audited.
const historySelect = {
  id: true, patientId: true, personalesPatologicos: true, padecimientoActual: true,
  diagnostico: true, tratamiento: true, createdAt: true, updatedAt: true,
  createdBy: true, updatedBy: true,
  inheritRelatives: { select: {
    id: true, negados: true, hta: true, dm: true, ca: true, respiratorios: true, otros: true,
  } },
  nonPathologicalPersonal: { select: {
    id: true, tabaquismo: true, alcoholismo: true, alergias: true, actFisica: true, otros: true,
  } },
  previousTreatment: { select: {
    id: true, minoxidil: true, fue: true, finasteride: true, fuss: true,
    dutasteride: true, bicalutamida: true, negados: true, otros: true,
  } },
  physicalExploration: { select: {
    id: true, fc: true, ta: true, fr: true, temperatura: true,
    peso: true, talla: true, tallaUnidad: true, description: true,
  } },
} as const satisfies Prisma.ClinicalHistorySelect;

const prescriptionSelect = {
  id: true, patientId: true, doctorId: true, prescriptionDate: true,
  notas: true, status: true, expiresAt: true, createdAt: true, updatedAt: true,
  createdBy: true, updatedBy: true,
  items: { orderBy: { id: 'asc' }, select: {
    id: true, productId: true, medicineName: true, dosage: true, frequency: true,
    durationDays: true, quantity: true, fulfillmentQuantity: true, instructions: true, requiresRefill: true,
    refillReminderDays: true, dispensed: true, dispensedAt: true,
    dispensedBy: true, dispensedQuantity: true,
  } },
} as const satisfies Prisma.PrescriptionSelect;

export type SnapshotModel = 'ClinicalHistory' | 'Prescription';
type Selection = { readonly [key: string]: true | { readonly select: Selection } };

export function auditSnapshotSelect(model: string) {
  if (model === 'ClinicalHistory') return historySelect;
  if (model === 'Prescription') return prescriptionSelect;
  return undefined;
}

function project(value: unknown, select: Selection): unknown {
  if (Array.isArray(value)) {
    return value.map(item => project(item, select)).sort((a, b) =>
      String((a as { id?: string })?.id ?? '').localeCompare(String((b as { id?: string })?.id ?? '')));
  }
  if (value == null || typeof value !== 'object') return value;
  const row = value as Record<string, unknown>;
  return Object.fromEntries(Object.entries(select).flatMap(([key, field]) => {
    if (!Object.prototype.hasOwnProperty.call(row, key)) return [];
    return [[key, field === true ? row[key] : project(row[key], field.select)]];
  }));
}

export function projectAuditSnapshot(model: string, value: unknown) {
  const select = auditSnapshotSelect(model);
  return select ? project(value, select) : value;
}

interface SnapshotScope {
  model: SnapshotModel;
  id: string;
  before: unknown;
  tx: Prisma.TransactionClient;
}

const snapshots = new AsyncLocalStorage<SnapshotScope>();
const transactions = new AsyncLocalStorage<Prisma.TransactionClient>();

export function scopedAuditSnapshot(model: string, id: unknown) {
  const scope = snapshots.getStore();
  return scope?.model === model && scope.id === id ? scope : undefined;
}

export function auditSnapshotTransaction() {
  return snapshots.getStore()?.tx ?? transactions.getStore();
}

/** All writes and audit events of an operational command share its tx. */
export function withAuditTransaction<T>(tx: Prisma.TransactionClient, save: () => Promise<T>): Promise<T> {
  return transactions.run(tx, async () => await save());
}

/** Freeze the selected before-state before nested writes, using the same tx. */
export function withAuditSnapshot<T>(model: SnapshotModel, id: string, before: unknown,
  tx: Prisma.TransactionClient, save: () => Promise<T>): Promise<T> {
  // Prisma starts a query when its thenable is awaited, not when constructed.
  return snapshots.run({ model, id, before: maskSensitive(projectAuditSnapshot(model, before)), tx }, async () => await save());
}
