import { PALETTE } from './zones';

const INK = '#14161F';
const WHITE = '#FFFFFF';

export type ZoneTone = { fill: string; border: string; chipBg: string; chipText: string };
export type ZoneSwatch = { name: string; light: ZoneTone; dark: ZoneTone };

function tone(color: string, chipText: string, border: string = color): ZoneTone {
  return { fill: color, border, chipBg: color, chipText };
}

// Los hex guardados (PALETTE) son identificadores estables; aquí se traducen al color que se pinta.
const SWATCHES: Record<string, ZoneSwatch> = {
  '#E4572E': { name: 'Teja', light: tone('#C2410C', WHITE), dark: tone('#FB923C', INK) },
  '#2E86AB': { name: 'Cobalto', light: tone('#1D4ED8', WHITE), dark: tone('#7DA2FF', INK) },
  '#3BB273': { name: 'Lima', light: tone('#4D7C0F', WHITE), dark: tone('#A3E635', INK) },
  '#F2A541': { name: 'Mostaza', light: tone('#EAB308', INK, '#A16207'), dark: tone('#FACC15', INK) },
  '#8E5DB8': { name: 'Uva', light: tone('#7C3AED', WHITE), dark: tone('#C4B5FD', INK) },
  '#D64C8C': { name: 'Frambuesa', light: tone('#BE185D', WHITE), dark: tone('#F9A8D4', INK) },
  '#1B998B': { name: 'Cian', light: tone('#0E7490', WHITE), dark: tone('#67E8F9', INK) },
  '#6C757D': { name: 'Pizarra', light: tone('#475569', WHITE), dark: tone('#CBD5E1', INK) },
};

const FALLBACK = SWATCHES[PALETTE[7]];

export function zoneSwatch(stored: string): ZoneSwatch {
  return SWATCHES[stored.toUpperCase()] ?? FALLBACK;
}
