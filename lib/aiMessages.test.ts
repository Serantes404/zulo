import { describe, it, expect } from 'vitest';
import { AI_MESSAGES } from './aiMessages';

describe('AI_MESSAGES', () => {
  it('QUOTA vale para el tope del grupo, del usuario y el global (no culpa al usuario)', () =>
    expect(AI_MESSAGES.QUOTA).toBe(
      'La detección con IA no está disponible ahora mismo. Inténtalo mañana o dibuja las zonas a mano.',
    ));
});
