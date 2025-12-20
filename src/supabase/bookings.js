import { supabase } from './client';

/**
 * CREAR RESERVA RELACIONAL (HEADER + ITEM)
 * Maneja tanto Villas como Experiencias en una estructura unificada.
 */
export const createBooking = async (
  product,
  totalAmount,
  reference,
  userEmail
) => {
  console.log('⚡ [KERNEL] Iniciando Transacción Relacional:', reference);

  // 1. CREAR LA CABECERA (La Carpeta de la Reserva)
  // Insertamos quién compra y cuánto paga en total.
  const { data: reservation, error: resError } = await supabase
    .from('reservations')
    .insert([
      {
        guest_email: userEmail,
        reference_code: reference,
        total_amount: totalAmount,
        status: 'PENDING', // Esperando confirmación de Wompi
      },
    ])
    .select()
    .single();

  if (resError) {
    console.error('🚨 Error Crítico creando reserva:', resError);
    return null;
  }

  const reservationId = reservation.id;

  // 2. DETECTAR EL TIPO DE PRODUCTO (Polimorfismo)
  // Si el producto tiene la propiedad 'categoria', sabemos que es una Experiencia.
  // Si no, asumimos que es una Villa (Propiedad).
  const isExperience = !!product.categoria;

  console.log(
    `ℹ️ Tipo de Item detectado: ${isExperience ? 'EXPERIENCIA' : 'VILLA'}`
  );

  // 3. PREPARAR EL ITEM
  const itemData = {
    reservation_id: reservationId,
    quantity: 1, // MVP: Siempre 1 por ahora
    price_at_purchase: totalAmount,

    // AQUÍ ESTÁ LA MAGIA: Llenamos el ID correcto y dejamos el otro en NULL
    // Esto es lo que permite que la base de datos mantenga la integridad referencial
    property_id: isExperience ? null : product.id,
    experience_id: isExperience ? product.id : null,
  };

  // 4. INSERTAR EL DETALLE (El Item dentro de la Reserva)
  const { error: itemError } = await supabase
    .from('reservation_items')
    .insert([itemData]);

  if (itemError) {
    console.error('🚨 Error vinculando item a la reserva:', itemError);
    // Rollback Manual: Si falla el item, borramos la reserva huérfana para no dejar basura.
    await supabase.from('reservations').delete().eq('id', reservationId);
    return null;
  }

  console.log('✅ Transacción Completada. ID:', reservationId);
  return reservation;
};
