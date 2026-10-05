import type { CreatePrescriptionItemData } from '@/hooks/use-prescriptions';
export function prescriptionItemPayload(item: CreatePrescriptionItemData) {
  return {
    ...(item.id && { id: item.id }),
    productId: item.productId || (item.id ? null : undefined),
    medicineName: item.medicineName.trim(),
    dosage: item.dosage?.trim() || (item.id ? null : undefined),
    frequency: item.frequency?.trim() || (item.id ? null : undefined),
    durationDays: item.durationDays || (item.id ? null : undefined),
    quantity: item.quantity,
    fulfillmentQuantity: item.fulfillmentQuantity,
    instructions: item.instructions?.trim() || (item.id ? null : undefined),
    requiresRefill: item.requiresRefill,
    refillReminderDays: item.refillReminderDays,
  };
}
