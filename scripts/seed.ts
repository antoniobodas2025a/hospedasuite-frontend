import { createClient } from '@supabase/supabase-js';
import { fakerES as faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runSeeder() {
  console.log('🚀 Sembrando datos (Versión Definitiva: Solo columna Price)...');
  
  for (let i = 0; i < 5; i++) {
    const rawName = `${faker.word.adjective()} ${faker.helpers.arrayElement(['Glamping', 'Refugio', 'Lodge'])}`;
    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    // 1. Crear el Hotel
    const { data: hotel, error: hotelError } = await supabase.from('hotels').insert({
      name,
      slug,
      location: faker.location.city() + ', Boyacá',
      status: 'active',
      main_image_url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800',
      category: 'montaña',
      type: 'glamping',
      tax_rate: 19
    }).select().single();

    if (hotelError) {
      console.error(`❌ Error al crear hotel ${name}:`, hotelError.message);
      continue;
    }

    if (hotel) {
      // 2. Crear las habitaciones (🚨 SIN price_per_night para que la DB no lo rechace)
      const { error: roomError } = await supabase.from('rooms').insert([
        { 
          hotel_id: hotel.id, 
          name: 'Suite Premium', 
          capacity: 2, 
          price: 250000, 
          status: 'available' 
        },
        { 
          hotel_id: hotel.id, 
          name: 'Domo Estándar', 
          capacity: 4, 
          price: 180000, 
          status: 'available' 
        }
      ]);

      if (roomError) {
        console.error(`❌ Falla crítica en habitaciones de ${name}:`, roomError.message);
      } else {
        console.log(`✅ Hotel visible creado CON habitaciones: ${name}`);
      }
    }
  }
  console.log('🎉 Sembrado finalizado.');
}

runSeeder();