// scripts/seed-ota.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// ==========================================
// 🧠 1. DICCIONARIOS SEMÁNTICOS (CONTEXTO COLOMBIA)
// ==========================================

const LOCATIONS = {
  antioquia: ['Guatapé, Antioquia', 'Jardín, Antioquia', 'Jericó, Antioquia'],
  eje_cafetero: ['Salento, Quindío', 'Filandia, Quindío', 'Santa Rosa de Cabal, Risaralda'],
  historico: ['Villa de Leyva, Boyacá', 'Barichara, Santander', 'Raquirá, Boyacá'],
  caribe_rural: ['Minca, Magdalena', 'Palomino, La Guajira'],
  sabana: ['Suesca, Cundinamarca', 'Guatavita, Cundinamarca']
};

const AMENITIES_CATALOG = {
  glamping: [
    { id: 'jacuzzi_privado', isFree: true, details: 'Agua termal a 38°C' },
    { id: 'malla_catamaran', isFree: true, details: 'Suspendida sobre el cañón' },
    { id: 'fogata', isFree: true, details: 'Kit de masmelos incluido' },
    { id: 'wifi', isFree: true, details: 'Starlink 200 Mbps' }
  ],
  boutique: [
    { id: 'lenceria_lujo', isFree: true, details: 'Algodón egipcio 400 hilos' },
    { id: 'desayuno_artesanal', isFree: true, details: 'A la carta servido en la habitación' },
    { id: 'safe', isFree: true, details: 'Caja fuerte digital' },
    { id: 'ac', isFree: true, details: 'Control de clima independiente' }
  ],
  cabana: [
    { id: 'zona_bbq', isFree: true, details: 'Asador a carbón y leña' },
    { id: 'cocina', isFree: true, details: 'Menaje completo' },
    { id: 'parking', isFree: true, details: 'Parqueadero cubierto' },
    { id: 'hot_water', isFree: true, details: 'Calentador a gas 24/7' }
  ],
  finca: [
    { id: 'pool', isFree: true, details: 'Piscina infinita privada' },
    { id: 'pet_friendly', isFree: true, details: 'Camas para mascotas' },
    { id: 'tv', isFree: true, details: 'Smart TV 75" con Netflix' },
    { id: 'cocina', isFree: true, details: 'Menaje para 15 personas' }
  ],
  hostal: [ // 🚨 RESTAURADO (Código Comido)
    { id: 'wifi', isFree: true, details: 'Fibra óptica simétrica 500 Mbps' },
    { id: 'coworking', isFree: true, details: 'Sillas ergonómicas' },
    { id: 'coffee', isFree: true, details: 'Café de origen ilimitado' }
  ]
};

// ==========================================
// 📸 2. BANCOS DE IMÁGENES: MOTOR CÍCLICO SEMÁNTICO
// ==========================================

const getImageUrl = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

const HOTEL_COVERS = [
  '1566073171614-6c49cc314227', '1518780664697-55e3ad937233', '1587061949409-02df41d5e562',
  '1542718610-a1d656d1884c', '1551882547-ff40c0d509af', '1600596542815-ffad4c1539a9',
  '1499916078039-922301b0eb9b', '1512917774080-9991f1c4c750', '1510798831971-661eb04b3739'
];

const ROOM_BATCHES = [
  ['1522771731470-ea357ffe32ce', '1590490360182-c33d57733427', '1582719478250-c89d1457d512', '1618221118493-9cbf1a1c50f6', '1505691938895-1758d7bef511'],
  ['1578683010236-d716f9a3f461', '1631049307264-da0ec9d70304', '1566665797719-1d77f61c6b12', '1616594039964-0004d31ce1bf', '1560448204675-8eb3c7a97ce9'],
  ['1528909514045-2b47e8bbbaec', '1540518614846-1536b13ed8c1', '1560185016347-14a7437119f9', '1573935293427-bd01889ba5ab', '1598928506311-c55dd58a24aa'],
  ['1582719478250-c89d1457d512', '1590490360182-c33d57733427', '1522771731470-ea357ffe32ce', '1631049307264-da0ec9d70304', '1578683010236-d716f9a3f461']
];

let coverIndex = 0;
let batchIndex = 0;

const getNextCover = () => getImageUrl(HOTEL_COVERS[coverIndex++ % HOTEL_COVERS.length]);
const getNextRoomBatch = () => ROOM_BATCHES[batchIndex++ % ROOM_BATCHES.length].map(getImageUrl);

// ==========================================
// 🛠️ 3. MOTOR ALGORÍTMICO
// ==========================================

const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);
const randomPrice = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min) * 1000;

// 🚨 RESTAURADA LA MATRIZ DE MERCADO COMPLETA
const ARCHITECTURE = [
  {
    category: 'Glamping',
    names: ['EcoDomo Aurora', 'Nómada Glamp Guatapé'],
    locationPool: LOCATIONS.sabana.concat(LOCATIONS.antioquia),
    priceRange: [350, 850],
    roomTypes: ['Domo Geodésico Élite', 'Tienda Safari Luxury']
  },
  {
    category: 'Hotel Boutique',
    names: ['Casa de la Inquisición', 'Villa Imperial'],
    locationPool: LOCATIONS.historico,
    priceRange: [400, 1200],
    roomTypes: ['Suite Presidencial Colonial', 'Habitación Deluxe King']
  },
  {
    category: 'Cabaña',
    names: ['Cabañas Niebla Andina', 'Bosque Escondido'],
    locationPool: LOCATIONS.eje_cafetero,
    priceRange: [180, 450],
    roomTypes: ['Cabaña Romántica Parejas', 'Cabaña Familiar 2 Pisos']
  },
  {
    category: 'Finca', // 🚨 RESTAURADO
    names: ['Hacienda Cafetera El Ocaso', 'Finca Tradicional Los Abuelos'],
    locationPool: LOCATIONS.eje_cafetero.concat(LOCATIONS.antioquia),
    priceRange: [800, 2500],
    roomTypes: ['Casa Principal (15 Pax)', 'Villa Independiente (8 Pax)']
  },
  {
    category: 'Hostal', // 🚨 RESTAURADO
    names: ['Casa Coliving Minca', 'Nómadas del Caribe Hostal'],
    locationPool: LOCATIONS.caribe_rural,
    priceRange: [120, 250],
    roomTypes: ['Habitación Privada Queen', 'Suite para Nómadas Digitales']
  }
];

// ==========================================
// 🚀 4. EJECUCIÓN MAESTRA
// ==========================================

async function runSeed() {
  console.log('🚀 Iniciando Motor Cíclico Enterprise...');

  for (const blueprint of ARCHITECTURE) {
    for (const hotelName of blueprint.names) {
      const slug = generateSlug(hotelName);
      const location = getRandom(blueprint.locationPool);

      const { data: hotel, error: hotelError } = await supabase.from('hotels').insert({
          name: hotelName,
          slug: slug,
          city_slug: location.split(',')[0].toLowerCase().trim().replace(/ /g, '-'),
          location: location,
          category: blueprint.category,
          main_image_url: getNextCover(),
          logo_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(hotelName)}&background=random&color=fff`,
          description: `Disfruta de la magia en ${hotelName}. Ubicado en ${location}.`,
          status: 'active',
          policies: { checkIn: { from: "15:00", to: "22:00" }, checkOut: "11:00", cancellation: { type: "flexible" } }
        }).select().single();

      if (hotelError) { console.error(`❌ Error ${hotelName}:`, hotelError.message); continue; }
      console.log(` ✅ Propiedad Creada: ${hotel.name}`);

      const numRooms = 2; 
      
      for (let r = 0; r < numRooms; r++) {
        const roomName = getRandom(blueprint.roomTypes);
        // Ajuste de capacidad lógico para fincas
        const capacity = blueprint.category === 'Finca' ? Math.floor(Math.random() * 5) + 10 : Math.floor(Math.random() * 3) + 2;
        
        const photoUrls = getNextRoomBatch();
        const galleryJSONB = photoUrls.map((url, idx) => ({
          url, alt: `Vista ${idx + 1} de ${roomName}`, order: idx + 1
        }));

        const categoryKey = blueprint.category.split(' ')[0].toLowerCase() as keyof typeof AMENITIES_CATALOG;
        
        await supabase.from('rooms').insert({
          hotel_id: hotel.id,
          name: `${roomName} ${r + 1}`,
          capacity: capacity,
          size_sqm: capacity * 12,
          price: randomPrice(blueprint.priceRange[0], blueprint.priceRange[1]),
          status: 'active',
          image_url: galleryJSONB[0].url, 
          gallery: galleryJSONB, 
          amenities: AMENITIES_CATALOG[categoryKey] || AMENITIES_CATALOG['cabana']
        });
      }
    }
  }
  console.log('\n🎉 Sembrado Premium Completado.');
}

runSeed();