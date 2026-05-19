// scripts/seed-ota-test.ts
// Seed script para probar la OTA con hoteles variados: diferentes capacidades, camas, amenities y precios.
// Uso: npx tsx scripts/seed-ota-test.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Room amenity IDs (must match ROOM_AMENITY_REGISTRY in src/lib/amenity-registry.ts) ──
const AMENITY_IDS = [
  'wifi', 'tv', 'ac', 'jacuzzi', 'bano_privado', 'parking',
  'minibar', 'chimenea', 'techo_panoramico', 'ducha_lluvia',
  'cama_premium', 'balcon',
];

const pickAmenities = (count: number) => {
  const shuffled = [...AMENITY_IDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(id => ({ id, isFree: true, details: '' }));
};

// ── Unsplash image IDs for rooms ──
const ROOM_IMAGES = [
  '1522771731470-ea357ffe32ce', '1590490360182-c33d57733427',
  '1582719478250-c89d1457d512', '1618221118493-9cbf1a1c50f6',
  '1505691938895-1758d7bef511', '1578683010236-d716f9a3f461',
  '1631049307264-da0ec9d70304', '1566665797719-1d77f61c6b12',
  '1616594039964-0004d31ce1bf', '1560448204675-8eb3c7a97ce9',
  '1528909514846-1536b13ed8c1', '1560185016347-14a7437119f9',
  '1573935293784-0f01c0d509af', '1540518614846-1536b13ed8c1',
  '1598928506311-c55dd58a24aa', '1582719478250-c89d1457d512',
];

const HOTEL_COVERS = [
  '1566073171614-6c49cc314227', '1518780664697-55e3ad937233',
  '1587061949409-02df41d5e562', '1542718610-a1d656d1884c',
  '1551882547-ff40c0d509af', '1600596542815-ffad4c1539a9',
  '1499916078039-922301b0eb9b', '1512917774080-9991f1c4c750',
  '1510798831971-661eb04b3739', '1520250497591-112f2df40bcd',
];

const img = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// ── Hotel definitions designed to test the OTA search/filter system ──
interface SeedHotel {
  name: string;
  location: string;
  category: string;
  type: string;
  stars: number;
  description: string;
  checkIn: string;
  checkOut: string;
  rooms: {
    name: string;
    capacity: number;
    beds: number;
    bedrooms?: number;
    price: number;
    size_sqm: number;
    bed_type?: string;
    amenityCount: number;
  }[];
}

const HOTELS: SeedHotel[] = [
  {
    name: 'Glamping Domo Solar',
    location: 'Villa de Leyva, Boyacá',
    category: 'Glamping',
    type: 'glamping',
    stars: 4,
    description: 'Domos geodésicos con vista al desierto de Villa de Leyva. Ideal para parejas y viajeros solitarios.',
    checkIn: '15:00',
    checkOut: '11:00',
    rooms: [
      { name: 'Domo Individual', capacity: 1, beds: 1, price: 180000, size_sqm: 25, bed_type: 'Individual', amenityCount: 4 },
      { name: 'Domo Pareja', capacity: 2, beds: 1, price: 280000, size_sqm: 35, bed_type: 'Doble', amenityCount: 6 },
      { name: 'Domo Familiar', capacity: 4, beds: 2, price: 420000, size_sqm: 50, bed_type: 'Doble + Individual', amenityCount: 5 },
    ],
  },
  {
    name: 'Hotel Boutique Casa Colonial',
    location: 'Barichara, Santander',
    category: 'Hotel Boutique',
    type: 'hotel',
    stars: 5,
    description: 'Hotel boutique en el pueblo más lindo de Colombia. Arquitectura colonial con lujo moderno.',
    checkIn: '15:00',
    checkOut: '12:00',
    rooms: [
      { name: 'Habitación Estándar', capacity: 2, beds: 1, price: 320000, size_sqm: 28, bed_type: 'Queen', amenityCount: 5 },
      { name: 'Suite Junior', capacity: 3, beds: 2, price: 480000, size_sqm: 42, bed_type: 'Queen + Sofá cama', amenityCount: 8 },
      { name: 'Suite Presidencial', capacity: 4, beds: 2, bedrooms: 2, price: 750000, size_sqm: 65, bed_type: 'King + Queen', amenityCount: 10 },
      { name: 'Penthouse Terraza', capacity: 6, beds: 3, bedrooms: 3, price: 1200000, size_sqm: 95, bed_type: '2 King + Individual', amenityCount: 12 },
    ],
  },
  {
    name: 'Cabañas del Eje Cafetero',
    location: 'Salento, Quindío',
    category: 'Cabaña',
    type: 'cabana',
    stars: 3,
    description: 'Cabañas de madera en medio del Valle de Cocora. Perfectas para familias y grupos.',
    checkIn: '14:00',
    checkOut: '11:00',
    rooms: [
      { name: 'Cabaña Romántica', capacity: 2, beds: 1, price: 220000, size_sqm: 30, bed_type: 'Doble', amenityCount: 4 },
      { name: 'Cabaña Familiar', capacity: 5, beds: 3, bedrooms: 2, price: 380000, size_sqm: 55, bed_type: 'Queen + 2 Individual', amenityCount: 6 },
      { name: 'Cabaña Grande', capacity: 8, beds: 4, bedrooms: 3, price: 550000, size_sqm: 80, bed_type: '2 Queen + 2 Individual', amenityCount: 7 },
    ],
  },
  {
    name: 'Finca Hotel Los Abuelos',
    location: 'Jardín, Antioquia',
    category: 'Finca',
    type: 'finca',
    stars: 4,
    description: 'Finca tradicional antioqueña con piscina, BBQ y amplias habitaciones para grupos grandes.',
    checkIn: '15:00',
    checkOut: '13:00',
    rooms: [
      { name: 'Habitación Principal', capacity: 4, beds: 2, price: 350000, size_sqm: 40, bed_type: '2 Queen', amenityCount: 5 },
      { name: 'Casa Completa (8 Pax)', capacity: 8, beds: 4, bedrooms: 3, price: 800000, size_sqm: 120, bed_type: '2 King + 2 Queen', amenityCount: 8 },
      { name: 'Villa Familiar (15 Pax)', capacity: 15, beds: 7, bedrooms: 5, price: 1500000, size_sqm: 200, bed_type: '3 King + 4 Individual', amenityCount: 10 },
      { name: 'Hacienda Completa (20 Pax)', capacity: 20, beds: 10, bedrooms: 7, price: 2500000, size_sqm: 350, bed_type: '4 King + 6 Individual', amenityCount: 12 },
    ],
  },
  {
    name: 'Hostal Nómadas Minca',
    location: 'Minca, Magdalena',
    category: 'Hostal',
    type: 'hostal',
    stars: 3,
    description: 'Hostal para nómadas digitales y mochileros. WiFi de alta velocidad y ambiente social.',
    checkIn: '14:00',
    checkOut: '11:00',
    rooms: [
      { name: 'Cama en Dormitorio (6 camas)', capacity: 1, beds: 1, price: 45000, size_sqm: 8, bed_type: 'Individual', amenityCount: 3 },
      { name: 'Habitación Privada', capacity: 2, beds: 1, price: 120000, size_sqm: 18, bed_type: 'Doble', amenityCount: 4 },
      { name: 'Suite Nómada', capacity: 3, beds: 2, price: 180000, size_sqm: 28, bed_type: 'Queen + Individual', amenityCount: 5 },
    ],
  },
  {
    name: 'Apartamentos Playa Palomino',
    location: 'Palomino, La Guajira',
    category: 'Apartamento',
    type: 'apartamento',
    stars: 4,
    description: 'Apartamentos frente al mar Caribe. Ideales para familias y estadías largas.',
    checkIn: '15:00',
    checkOut: '12:00',
    rooms: [
      { name: 'Studio Pareja', capacity: 2, beds: 1, price: 250000, size_sqm: 35, bed_type: 'Queen', amenityCount: 5 },
      { name: 'Apartamento 1 Habitación', capacity: 4, beds: 2, bedrooms: 1, price: 380000, size_sqm: 55, bed_type: 'Queen + Sofá cama', amenityCount: 7 },
      { name: 'Apartamento 2 Habitaciones', capacity: 6, beds: 3, bedrooms: 2, price: 520000, size_sqm: 75, bed_type: 'King + Queen + Sofá cama', amenityCount: 8 },
      { name: 'Penthouse Vista Mar', capacity: 8, beds: 4, bedrooms: 3, price: 850000, size_sqm: 110, bed_type: '2 King + 2 Queen', amenityCount: 10 },
    ],
  },
  {
    name: 'Refugio de Montaña Suesca',
    location: 'Suesca, Cundinamarca',
    category: 'Refugio',
    type: 'refugio',
    stars: 3,
    description: 'Refugio para escaladores y amantes de la naturaleza. Vistas al roquedal de Suesca.',
    checkIn: '14:00',
    checkOut: '10:00',
    rooms: [
      { name: 'Cuarto Básico', capacity: 2, beds: 1, price: 80000, size_sqm: 15, bed_type: 'Doble', amenityCount: 3 },
      { name: 'Cuarto con Chimenea', capacity: 3, beds: 2, price: 150000, size_sqm: 25, bed_type: 'Queen + Individual', amenityCount: 5 },
      { name: 'Cabaña Escaladores', capacity: 6, beds: 3, bedrooms: 2, price: 280000, size_sqm: 45, bed_type: 'Queen + 2 Individual', amenityCount: 4 },
    ],
  },
  {
    name: 'Hotel Spa Termal Santa Rosa',
    location: 'Santa Rosa de Cabal, Risaralda',
    category: 'Hotel Spa',
    type: 'hotel',
    stars: 5,
    description: 'Hotel de lujo con aguas termales naturales. Experiencia wellness completa.',
    checkIn: '15:00',
    checkOut: '12:00',
    rooms: [
      { name: 'Habitación Superior', capacity: 2, beds: 1, price: 450000, size_sqm: 32, bed_type: 'King', amenityCount: 7 },
      { name: 'Suite con Jacuzzi', capacity: 2, beds: 1, price: 680000, size_sqm: 45, bed_type: 'King', amenityCount: 10 },
      { name: 'Suite Familiar Termal', capacity: 5, beds: 3, bedrooms: 2, price: 950000, size_sqm: 70, bed_type: 'King + 2 Queen', amenityCount: 11 },
      { name: 'Villa Privada Spa', capacity: 8, beds: 4, bedrooms: 3, price: 1800000, size_sqm: 130, bed_type: '2 King + 2 Queen', amenityCount: 12 },
    ],
  },
];

// ── Seed execution ──
async function runSeed() {
  console.log('🌱 Seed OTA Test — Hotels with varied capacities, beds, and amenities\n');

  let hotelCount = 0;
  let roomCount = 0;

  for (const hotelDef of HOTELS) {
    const slug = slugify(hotelDef.name);

    // Check if hotel already exists
    const { data: existing } = await supabase.from('hotels').select('id').eq('slug', slug).single();
    if (existing) {
      console.log(`⏭️  Skipping "${hotelDef.name}" — already exists (slug: ${slug})`);
      hotelCount++;
      roomCount += hotelDef.rooms.length;
      continue;
    }

    // Create hotel
    const { data: hotel, error: hotelError } = await supabase.from('hotels').insert({
      name: hotelDef.name,
      slug,
      location: hotelDef.location,
      city_slug: slugify(hotelDef.location.split(',')[0]),
      category: hotelDef.category,
      type: hotelDef.type,
      stars: hotelDef.stars,
      status: 'active',
      main_image_url: img(pick(HOTEL_COVERS)),
      cover_photo_url: img(pick(HOTEL_COVERS)),
      description: hotelDef.description,
      check_in_time: hotelDef.checkIn,
      check_out_time: hotelDef.checkOut,
      tagline: `${hotelDef.category} en ${hotelDef.location.split(',')[0]}`,
      amenities: pickAmenities(randInt(3, 6)).map(a => a.id),
      gallery_urls: Array.from({ length: 4 }, () => img(pick(HOTEL_COVERS))),
      policies: {
        checkIn: { from: hotelDef.checkIn, to: '22:00' },
        checkOut: hotelDef.checkOut,
        cancellation: { type: 'moderate' },
      },
    }).select().single();

    if (hotelError) {
      console.error(`❌ Error creating "${hotelDef.name}": ${hotelError.message}`);
      continue;
    }

    console.log(`✅ Hotel: ${hotelDef.name} (${hotelDef.location}) — ${hotelDef.rooms.length} rooms`);

    // Create rooms
    for (const roomDef of hotelDef.rooms) {
      const roomImages = Array.from({ length: 4 }, () => img(pick(ROOM_IMAGES)));
      const galleryJSONB = roomImages.map((url, idx) => ({
        url,
        alt: `${roomDef.name} — vista ${idx + 1}`,
        order: idx + 1,
      }));

      const { error: roomError } = await supabase.from('rooms').insert({
        hotel_id: hotel.id,
        name: roomDef.name,
        capacity: roomDef.capacity,
        beds: roomDef.beds,
        bedrooms: roomDef.bedrooms || null,
        price: roomDef.price,
        size_sqm: roomDef.size_sqm,
        bed_type: roomDef.bed_type || null,
        status: 'active',
        image_url: roomImages[0],
        gallery: galleryJSONB,
        amenities: pickAmenities(roomDef.amenityCount),
        description: `${roomDef.name} — Capacidad para ${roomDef.capacity} personas, ${roomDef.beds} cama${roomDef.beds > 1 ? 's' : ''}. ${roomDef.size_sqm}m².`,
      });

      if (roomError) {
        console.error(`   ❌ Room "${roomDef.name}": ${roomError.message}`);
      } else {
        console.log(`   ✅ ${roomDef.name} — Cap: ${roomDef.capacity}, Camas: ${roomDef.beds}, $${roomDef.price.toLocaleString()}`);
        roomCount++;
      }
    }

    hotelCount++;
    console.log('');
  }

  console.log(`\n🎉 Seed complete: ${hotelCount} hotels, ${roomCount} rooms total`);
  console.log('\n📊 Capacity range: 1–20 guests');
  console.log('🛏️  Beds range: 1–10 per room');
  console.log('💰 Price range: $45,000 – $2,500,000 COP/night');
  console.log('\n🔗 Test URLs:');
  for (const h of HOTELS) {
    console.log(`   /hotel/${slugify(h.name)}`);
  }
}

runSeed();
