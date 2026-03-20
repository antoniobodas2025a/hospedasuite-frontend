/**
 * Calcula el precio total de una estadía teniendo en cuenta tarifas de fin de semana.
 * Días de fin de semana estándar: Viernes (5) y Sábado (6).
 */
export function calculateStayPrice(
  checkInStr: string,
  checkOutStr: string,
  basePrice: number,
  weekendPrice?: number
): { totalPrice: number; totalNights: number; weekendNights: number; weekdayNights: number } {
  // Aseguramos un parseo seguro ignorando la zona horaria local
  const checkIn = new Date(`${checkInStr}T12:00:00Z`);
  const checkOut = new Date(`${checkOutStr}T12:00:00Z`);
  
  // Validaciones de seguridad
  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return { totalPrice: 0, totalNights: 0, weekendNights: 0, weekdayNights: 0 };
  }

  const durationMs = checkOut.getTime() - checkIn.getTime();
  const totalNights = Math.round(durationMs / (1000 * 60 * 60 * 24));

  if (totalNights <= 0) {
    return { totalPrice: 0, totalNights: 0, weekendNights: 0, weekdayNights: 0 };
  }

  let totalPrice = 0;
  let weekendNights = 0;
  let weekdayNights = 0;

  // Si no hay precio de fin de semana configurado, usamos el precio base
  const effectiveWeekendPrice = weekendPrice && weekendPrice > 0 ? weekendPrice : basePrice;

  // Iteramos noche por noche para saber qué día de la semana cae
  let currentDate = new Date(checkIn.getTime());

  for (let i = 0; i < totalNights; i++) {
    const dayOfWeek = currentDate.getUTCDay();
    
    // 5 = Viernes, 6 = Sábado
    // (Nota: Si tu cliente considera el domingo como fin de semana, cambiamos esto a 0)
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      totalPrice += effectiveWeekendPrice;
      weekendNights++;
    } else {
      totalPrice += basePrice;
      weekdayNights++;
    }

    // Avanzamos al siguiente día
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    totalPrice,
    totalNights,
    weekendNights,
    weekdayNights
  };
}