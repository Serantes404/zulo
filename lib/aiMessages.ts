import type { DetectResult } from '@/lib/ai/detectZones';

type AiReason = Extract<DetectResult, { ok: false }>['reason'];

// Textos para el usuario según el motivo por el que falló la detección con IA.
// QUOTA lo lanza consume_ai_quota por el tope del grupo, del usuario o el global diario: el texto vale para los tres.
export const AI_MESSAGES: Record<AiReason, string> = {
  NO_ZONES: 'No he podido detectar zonas, dibújalas tú.',
  TIMEOUT: 'La IA ha tardado demasiado. Dibuja las zonas a mano o inténtalo de nuevo.',
  UNAVAILABLE: 'La IA no está disponible ahora. Puedes dibujar las zonas a mano.',
  TOO_LARGE: 'La imagen es demasiado grande (máx. 5 MB). Prueba con una más pequeña.',
  QUOTA: 'La detección con IA no está disponible ahora mismo. Inténtalo mañana o dibuja las zonas a mano.',
};
