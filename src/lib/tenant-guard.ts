/**
 * 🔒 Tenant Guard — Wrapper obligatorio para queries multi-tenant
 *
 * Elimina la posibilidad de olvidar el filtro `hotel_id` en las queries.
 * SIEMPRE se debe usar esta función en lugar de `supabase.from().select()`
 * directo cuando se accede a datos de un hotel específico.
 *
 * Uso:
 *   // ❌ MAL (puede olvidar el filtro):
 *   const { data } = await supabase.from('rooms').select('*');
 *
 *   // ✅ BIEN (obligatorio):
 *   const { data } = await tenantQuery(supabase.from('rooms').select('*'), hotelId);
 */

/**
 * Aplica automáticamente el filtro `hotel_id` a cualquier query de Supabase.
 *
 * @param query - La query de Supabase (ej: `supabase.from('rooms').select('*')`)
 * @param hotelId - El ID del hotel actual (tenant)
 * @returns La query con el filtro aplicado
 */
export function tenantQuery<T>(
  query: any,
  hotelId: string
) {
  return query.eq('hotel_id', hotelId) as typeof query;
}

/**
 * Aplica filtro `hotel_id` para queries de inserción.
 * Útil para asegurar que los datos se inserten con el tenant correcto.
 */
export function tenantInsert<T extends { hotel_id?: string }>(
  data: T,
  hotelId: string
): T & { hotel_id: string } {
  return { ...data, hotel_id: hotelId };
}
