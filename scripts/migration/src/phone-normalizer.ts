/**
 * Normalize Mexican phone numbers to +52XXXXXXXXXX format.
 * Best-effort: logs failures, returns original if can't normalize.
 */

const warnings: string[] = [];

export function normalizePhone(raw: string | null | undefined): { normalized: string | null; warning?: string } {
  if (!raw || raw.trim() === '') {
    return { normalized: null };
  }

  // Strip all non-digit characters
  let digits = raw.replace(/\D/g, '');

  // Remove leading country code if present
  if (digits.startsWith('52') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('521') && digits.length === 13) {
    // Old mobile prefix +521
    digits = digits.slice(3);
  } else if (digits.startsWith('1') && digits.length === 11) {
    // Some numbers stored with leading 1
    digits = digits.slice(1);
  }

  // Valid Mexican number: 10 digits
  if (digits.length === 10) {
    return { normalized: `+52${digits}` };
  }

  // If it's already a full international number with country code
  if (digits.length > 10 && digits.length <= 15) {
    const warning = `Non-standard phone length (${digits.length} digits): "${raw}" → kept as +${digits}`;
    warnings.push(warning);
    return { normalized: `+${digits}`, warning };
  }

  const warning = `Cannot normalize phone: "${raw}" (${digits.length} digits after cleanup)`;
  warnings.push(warning);
  return { normalized: null, warning };
}

export function getPhoneWarnings(): string[] {
  return [...warnings];
}

export function clearPhoneWarnings(): void {
  warnings.length = 0;
}
