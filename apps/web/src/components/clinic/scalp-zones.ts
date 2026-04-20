/**
 * Layout compartido de las zonas del cuero cabelludo para la vista superior.
 * Los nombres deben coincidir con los seedeados en la tabla `donor_zones`.
 * Las 3 zonas no-scalp (Barba, Cejas, Lados) no están en el layout — se
 * muestran como chips al lado del mapa.
 */
export type ZoneLayout = {
  rect: { x: number; y: number; w: number; h: number };
  label: { x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end' };
};

export const ZONE_LAYOUT: Record<string, ZoneLayout> = {
  Frontal: {
    rect: { x: 30, y: 22, w: 140, h: 33 },
    label: { x: 100, y: 42, text: 'Frontal' },
  },
  'Frontal media': {
    rect: { x: 60, y: 55, w: 80, h: 30 },
    label: { x: 100, y: 73, text: 'Frontal media' },
  },
  Medio: {
    rect: { x: 60, y: 85, w: 80, h: 25 },
    label: { x: 100, y: 101, text: 'Medio' },
  },
  Coronilla: {
    rect: { x: 60, y: 110, w: 80, h: 40 },
    label: { x: 100, y: 133, text: 'Coronilla' },
  },
  Occipital: {
    rect: { x: 30, y: 150, w: 140, h: 38 },
    label: { x: 100, y: 173, text: 'Occipital' },
  },
  'Parietal Izquierdo': {
    rect: { x: 30, y: 55, w: 30, h: 55 },
    label: { x: 45, y: 85, text: 'P. Izq' },
  },
  'Parietal Derecho': {
    rect: { x: 140, y: 55, w: 30, h: 55 },
    label: { x: 155, y: 85, text: 'P. Der' },
  },
  'Temporal Izquierdo': {
    rect: { x: 30, y: 110, w: 30, h: 40 },
    label: { x: 45, y: 133, text: 'T. Izq' },
  },
  'Temporal Derecho': {
    rect: { x: 140, y: 110, w: 30, h: 40 },
    label: { x: 155, y: 133, text: 'T. Der' },
  },
};

/**
 * Mapea nombres de variants (catalog) a un severity 0-1 para la zona
 * receptora. Los variants en DB no son estrictamente Norwood sino
 * categorías diagnósticas (Androgenética, Difusa, etc.); el max gana.
 */
const VARIANT_SEVERITY: Record<string, number> = {
  'Receptora amplia': 0.8,
  'Androgenética': 0.55,
  'Difusa': 0.5,
  'Frontal': 0.4,
  'Cicatricial': 0.45,
  'Areata': 0.35,
  'Universal': 0.9,
  'Donante escasa': 0.6,
};

export function variantsToSeverity(variantNames: string[]): number {
  if (variantNames.length === 0) return 0;
  let max = 0.3;
  for (const name of variantNames) {
    const v = VARIANT_SEVERITY[name];
    if (v && v > max) max = v;
  }
  return max;
}
