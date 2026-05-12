// ============================================================================
// 🔧 Utilidades de Booking — funciones puras sin dependencias
// ============================================================================

/**
 * Error de PostgreSQL tipado. Usado para identificar colisiones temporales
 * y otros errores de integridad desde Supabase/PostgREST.
 */
export interface PostgresError {
  message?: string;
  code?: string;
  details?: string;
}

/**
 * 🛡️ Verificador de Colisión Temporal
 * Mapea las restricciones de exclusión de PostgreSQL al lenguaje del Frontend.
 *
 * Detecta tres patrones de colisión:
 * 1. Mensaje incluye 'no_overlapping_bookings' — restricción de exclusión
 * 2. Mensaje incluye 'prevent_double_booking' — trigger de integridad
 * 3. Código '23P04' — SQLSTATE: exclusion_violation (genérico)
 */
export function isTemporalCollision(error: PostgresError | null | undefined): boolean {
  if (!error) return false;
  return (
    (error.message?.includes('no_overlapping_bookings') ?? false) ||
    (error.message?.includes('prevent_double_booking') ?? false) ||
    error.code === '23P04'
  );
}
