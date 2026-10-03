import type { CreatePrescriptionItemData } from '@/hooks/use-prescriptions';
export function prescriptionItemPayload(item: CreatePrescriptionItemData) {
  return {
    ...(item.id && { id: item.id }),
    productId: item.productId || undefined,
    medicineName: item.medicineName.trim(),
    dosage: item.dosage?.trim() || undefined,
    frequency: item.frequency?.trim() || undefined,
    durationDays: item.durationDays || undefined,
    quantity: item.quantity,
    instructions: item.instructions?.trim() || undefined,
    requiresRefill: item.requiresRefill,
    refillReminderDays: item.refillReminderDays,
  };
}
