// src/utils/sireGenerator.js
export const generateSIRE = (bookings, hotelInfo) => {
  const reportDate = new Date().toISOString().split('T')[0];
  let content = '';
  let count = 0;

  // Tabla Oficial de Migración Colombia
  const sireCountryCodes = {
    COL: 169,
    USA: 245,
    ESP: 724,
    FRA: 250,
    DEU: 276,
    ARG: 32,
    BRA: 76,
    CHL: 152,
    ECU: 218,
    MEX: 484,
    PER: 604,
    VEN: 862,
    CAN: 124,
    GBR: 826,
    ITA: 380,
    PAN: 591,
    CRI: 188,
  };

  const activeBookings = bookings.filter(
    (b) => b.status === 'confirmed' && b.guests
  );

  if (activeBookings.length === 0) {
    return alert(
      '⚠️ No hay huéspedes activos con Check-In confirmado para reportar.'
    );
  }

  activeBookings.forEach((b) => {
    const g = b.guests;
    let docType = 'PA';
    if (g.nationality === 'COL') {
      docType = g.doc_number.length > 10 ? 'TI' : 'CC';
    } else {
      if (/^\d+$/.test(g.doc_number) && g.doc_number.length < 10) {
        docType = 'CE';
      } else {
        docType = 'PA';
      }
    }

    const countryCode = sireCountryCodes[g.nationality] || 999;
    const safeName = g.full_name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/Ñ/g, 'N')
      .replace(/[^A-Z0-9 ]/g, '');

    const checkInSafe = b.check_in || reportDate;
    const checkOutSafe = b.check_out || reportDate;
    const birthSafe = g.birth_date || '1990-01-01';

    content += `${docType}|${
      g.doc_number
    }|${safeName}|${countryCode}|${birthSafe}|${
      g.gender || 'M'
    }|${checkInSafe}|${checkOutSafe}\n`;
    count++;
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `SIRE_${
    hotelInfo?.name.replace(/\s+/g, '_') || 'HOTEL'
  }_${reportDate}.txt`;
  link.click();

  alert(`✅ Archivo SIRE generado con ${count} registros.`);
};
