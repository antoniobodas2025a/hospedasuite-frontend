/**
 * Seed 3 demo hotels with different plans, photos, and rooms.
 *
 * Usage: npx tsx scripts/seed-demo-hotels.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ─── Config ────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const IMAGE_DIR = '/home/anto/Descargas/patio del mundo'
const STORAGE_BUCKET = 'hotel-images'

// ─── Demo Hotels ───────────────────────────────────────────────

interface DemoHotel {
  name: string
  city: string
  location: string
  type: 'hotel' | 'glamping' | 'cabanas' | 'hostal' | 'apartamento'
  plan: 'starter' | 'pro' | 'enterprise'
  email: string
  password: string
  description: string
  whatsapp: string
  cancellationPolicy: string
  amenities: string[]
  checkIn: string
  checkOut: string
  rooms: {
    name: string
    type: string
    price: number
    capacity: number
    beds: number
    bedType: string
    bathroomType: string
    showerType: string
    hotWater: boolean
    roomSize: string
    roomView: string
    description: string
    amenities: string[]
    images: string[] // filenames from IMAGE_DIR
  }[]
  galleryImages: string[] // filenames from IMAGE_DIR
  logoImage: string // filename from IMAGE_DIR
}

const demoHotels: DemoHotel[] = [
  {
    name: 'Patio del Mundo',
    city: 'Medellín',
    location: 'El Poblado',
    type: 'hotel',
    plan: 'enterprise',
    email: 'admin@patiodelmundo.com',
    password: 'Demo1234!',
    description: 'Hotel boutique en el corazón de El Poblado con vistas panorámicas a la ciudad. Arquitectura colonial renovada con amenities de lujo.',
    whatsapp: '+57 300 123 4567',
    cancellationPolicy: 'Cancelación gratuita hasta 48 horas antes del check-in. Después de ese plazo se cobra el equivalente a una noche de estadía.',
    amenities: ['wifi', 'parking', 'pool', 'breakfast', 'ac', 'gym', 'restaurant', 'bar', 'spa'],
    checkIn: '15:00',
    checkOut: '11:00',
    rooms: [
      {
        name: 'Suite Colonial',
        type: 'Suite',
        price: 450000,
        capacity: 2,
        beds: 1,
        bedType: 'king',
        bathroomType: 'en-suite',
        showerType: 'ambos',
        hotWater: true,
        roomSize: 'grande',
        roomView: 'ciudad',
        description: 'Suite amplia con balcón privado y vista a la ciudad. Decoración colonial con toques modernos.',
        amenities: ['wifi', 'ac', 'tv', 'minibar', 'bano_privado', 'cama_premium'],
        images: ['11503356.jpg', '11503382.jpg', '12108187.jpg'],
      },
      {
        name: 'Habitación Montaña',
        type: 'Estándar',
        price: 280000,
        capacity: 2,
        beds: 1,
        bedType: 'queen',
        bathroomType: 'privado',
        showerType: 'ducha',
        hotWater: true,
        roomSize: 'mediano',
        roomView: 'montana',
        description: 'Habitación acogedora con vista a las montañas del Valle de Aburrá.',
        amenities: ['wifi', 'ac', 'tv', 'bano_privado'],
        images: ['21350495.jpg', '21350498.jpg'],
      },
      {
        name: 'Doble Familiar',
        type: 'Familiar',
        price: 350000,
        capacity: 4,
        beds: 2,
        bedType: 'doble',
        bathroomType: 'privado',
        showerType: 'ducha',
        hotWater: true,
        roomSize: 'grande',
        roomView: 'jardin',
        description: 'Espaciosa habitación familiar con dos camas dobles y vista al jardín interior.',
        amenities: ['wifi', 'ac', 'tv', 'bano_privado', 'cama_premium'],
        images: ['6460868.jpg', '6460872.jpg'],
      },
    ],
    galleryImages: ['11503356.jpg', '11503392.jpg', '11505634.jpg', '11505645.jpg', '12108187.jpg', '21350543.jpg'],
    logoImage: 'logo-patiodelmundo.svg',
  },
  {
    name: 'Refugio Glamping Sierra',
    city: 'Santa Elena',
    location: 'Vereda La Unión',
    type: 'glamping',
    plan: 'pro',
    email: 'admin@refugiosierra.com',
    password: 'Demo1234!',
    description: 'Experiencia de glamping de lujo en medio de la naturaleza. Domos geodésicos con techo panorámico para ver las estrellas.',
    whatsapp: '+57 310 987 6543',
    cancellationPolicy: 'Cancelación gratuita hasta 72 horas antes del check-in. En temporada alta (diciembre-enero) se requiere 7 días de anticipación.',
    amenities: ['wifi', 'breakfast', 'chimenea', 'techo_panoramico', 'ducha_lluvia'],
    checkIn: '14:00',
    checkOut: '12:00',
    rooms: [
      {
        name: 'Domo Estelar',
        type: 'Domo',
        price: 380000,
        capacity: 2,
        beds: 1,
        bedType: 'king',
        bathroomType: 'en-suite',
        showerType: 'ducha',
        hotWater: true,
        roomSize: 'mediano',
        roomView: 'exterior',
        description: 'Domo geodésico con techo transparente para disfrutar del cielo estrellado. Chimenea privada y cama king premium.',
        amenities: ['chimenea', 'techo_panoramico', 'ducha_lluvia', 'cama_premium', 'wifi'],
        images: ['21350502.jpg', '21350505.jpg', '21350508.jpg'],
      },
      {
        name: 'Cabaña del Bosque',
        type: 'Cabaña',
        price: 290000,
        capacity: 3,
        beds: 2,
        bedType: 'doble',
        bathroomType: 'privado',
        showerType: 'ducha',
        hotWater: true,
        roomSize: 'mediano',
        roomView: 'jardin',
        description: 'Cabaña de madera rodeada de bosque nativo. Ideal para familias pequeñas.',
        amenities: ['chimenea', 'wifi', 'cama_premium'],
        images: ['21350510.jpg', '21350512.jpg'],
      },
    ],
    galleryImages: ['21350502.jpg', '21350505.jpg', '21350508.jpg', '21350517.jpg', '21350522.jpg'],
    logoImage: 'logo-patiodelmundo.svg',
  },
  {
    name: 'Hostal La Candelaria',
    city: 'Medellín',
    location: 'Centro Histórico',
    type: 'hostal',
    plan: 'starter',
    email: 'admin@hostalcandelaria.com',
    password: 'Demo1234!',
    description: 'Hostal vibrante en el centro histórico de Medellín. Ambiente social, eventos culturales y la mejor ubicación para explorar la ciudad.',
    whatsapp: '+57 320 555 1234',
    cancellationPolicy: 'Cancelación gratuita hasta 24 horas antes del check-in.',
    amenities: ['wifi', 'breakfast', 'luggage_storage', 'keyless_entry'],
    checkIn: '15:00',
    checkOut: '11:00',
    rooms: [
      {
        name: 'Privada con Balcón',
        type: 'Privada',
        price: 120000,
        capacity: 2,
        beds: 1,
        bedType: 'doble',
        bathroomType: 'compartido',
        showerType: 'ducha',
        hotWater: true,
        roomSize: 'pequeno',
        roomView: 'ciudad',
        description: 'Habitación privada con balcón al centro histórico. Baño compartido limpio y moderno.',
        amenities: ['wifi', 'balcon'],
        images: ['4369866.jpg', '4369945.jpg'],
      },
      {
        name: 'Cama en Compartida (6)',
        type: 'Compartida',
        price: 55000,
        capacity: 1,
        beds: 1,
        bedType: 'litera',
        bathroomType: 'compartido',
        showerType: 'ducha',
        hotWater: true,
        roomSize: 'pequeno',
        roomView: 'interior',
        description: 'Cama individual en habitación compartida de 6 personas. Lockers personales incluidos.',
        amenities: ['wifi'],
        images: ['6460906.jpg', '6460945.jpg'],
      },
      {
        name: 'Suite Privada Premium',
        type: 'Suite',
        price: 180000,
        capacity: 2,
        beds: 1,
        bedType: 'queen',
        bathroomType: 'privado',
        showerType: 'ducha',
        hotWater: true,
        roomSize: 'mediano',
        roomView: 'ciudad',
        description: 'La mejor habitación del hostal. Baño privado, cama queen y vista al Parque Berrío.',
        amenities: ['wifi', 'tv', 'bano_privado', 'cama_premium'],
        images: ['6460979.jpg', '6460986.jpg'],
      },
    ],
    galleryImages: ['4369866.jpg', '4369945.jpg', '6460906.jpg', '6460945.jpg', '6460979.jpg'],
    logoImage: 'logo-patiodelmundo.svg',
  },
]

// ─── Helpers ───────────────────────────────────────────────────

async function uploadFile(filePath: string, bucketPath: string): Promise<string | null> {
  const fileData = fs.readFileSync(filePath)
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(bucketPath, fileData, {
      contentType: filePath.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg',
      upsert: true,
    })

  if (error) {
    console.error(`  ❌ Upload failed: ${bucketPath} — ${error.message}`)
    return null
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

async function createOrGetUser(email: string, password: string): Promise<string | null> {
  // Try to create user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    if (error.message.includes('already exists')) {
      // Get existing user
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users.find(u => u.email === email)
      if (existing) return existing.id
    }
    console.error(`  ❌ Auth error for ${email}: ${error.message}`)
    return null
  }

  return data.user.id
}

// ─── Main ──────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding 3 demo hotels...\n')

  // Ensure storage bucket exists
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET)

  if (!bucketExists) {
    console.log(`📦 Creating storage bucket: ${STORAGE_BUCKET}`)
    await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 10_485_760, // 10MB
    })
  }

  for (const hotel of demoHotels) {
    console.log(`\n🏨 ${hotel.name} (${hotel.plan})`)
    console.log(`   📍 ${hotel.city}, ${hotel.location}`)

    // 1. Create auth user
    const userId = await createOrGetUser(hotel.email, hotel.password)
    if (!userId) {
      console.log('   ⏭️ Skipping — auth failed')
      continue
    }
    console.log(`   👤 User: ${userId.slice(0, 8)}...`)

    // 2. Upload logo
    let logoUrl: string | null = null
    const logoPath = path.join(IMAGE_DIR, hotel.logoImage)
    if (fs.existsSync(logoPath)) {
      logoUrl = await uploadFile(logoPath, `logos/${hotel.name.toLowerCase().replace(/\s+/g, '-')}.svg`)
      if (logoUrl) console.log(`   🖼️ Logo: ${logoUrl.slice(0, 60)}...`)
    }

    // 3. Upload gallery images
    const galleryUrls: string[] = []
    for (const img of hotel.galleryImages) {
      const imgPath = path.join(IMAGE_DIR, img)
      if (fs.existsSync(imgPath)) {
        const url = await uploadFile(imgPath, `gallery/${hotel.name.toLowerCase().replace(/\s+/g, '-')}/${img}`)
        if (url) galleryUrls.push(url)
      }
    }
    console.log(`   📸 Gallery: ${galleryUrls.length} images`)

    // 4. Create hotel record
    const { data: hotelData, error: hotelError } = await supabase
      .from('hotels')
      .insert({
        name: hotel.name,
        city: hotel.city,
        location: hotel.location,
        type: hotel.type,
        description: hotel.description,
        whatsapp_number: hotel.whatsapp,
        cancellation_policy: hotel.cancellationPolicy,
        amenities: hotel.amenities,
        check_in_time: hotel.checkIn,
        check_out_time: hotel.checkOut,
        gallery_urls: galleryUrls,
        logo_url: logoUrl,
        status: 'active',
        is_onboarding_complete: true,
        onboarding_step: 6,
        subscription_plan: hotel.plan,
        subscription_status: 'active',
        trial_ends_at: new Date(Date.now() - 86400000 * 30).toISOString(), // trial ended 30 days ago
        billing_cycle_start: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (hotelError) {
      console.error(`   ❌ Hotel creation failed: ${hotelError.message}`)
      continue
    }

    const hotelId = hotelData.id
    console.log(`   🏨 Hotel ID: ${hotelId}`)

    // 5. Link staff
    const { error: staffError } = await supabase
      .from('staff')
      .insert({
        user_id: userId,
        hotel_id: hotelId,
        role: 'admin',
        name: hotel.name,
      })

    if (staffError) {
      console.error(`   ❌ Staff link failed: ${staffError.message}`)
    } else {
      console.log(`   🔗 Staff linked`)
    }

    // 6. Create rooms
    for (const room of hotel.rooms) {
      // Upload room images
      const roomImageUrls: string[] = []
      for (const img of room.images) {
        const imgPath = path.join(IMAGE_DIR, img)
        if (fs.existsSync(imgPath)) {
          const url = await uploadFile(imgPath, `rooms/${hotel.name.toLowerCase().replace(/\s+/g, '-')}/${img}`)
          if (url) roomImageUrls.push(url)
        }
      }

      const { error: roomError } = await supabase
        .from('rooms')
        .insert({
          hotel_id: hotelId,
          name: room.name,
          type: room.type,
          price: room.price,
          description: room.description,
          amenities: room.amenities,
          capacity: room.capacity,
          beds: room.beds,
          bed_type: room.bedType,
          bathroom_type: room.bathroomType,
          shower_type: room.showerType,
          hot_water: room.hotWater,
          room_size: room.roomSize,
          room_view: room.roomView,
          gallery: roomImageUrls.map(url => ({ url })),
          status: 'active',
          ical_export_token: crypto.randomUUID(),
        })

      if (roomError) {
        console.error(`   ❌ Room "${room.name}" failed: ${roomError.message}`)
      } else {
        console.log(`   🛏️ Room: ${room.name} ($${room.price.toLocaleString()}) — ${roomImageUrls.length} images`)
      }
    }

    console.log(`   ✅ Done\n`)
  }

  console.log('\n🎉 Seed complete!\n')

  // Print access info
  console.log('═══════════════════════════════════════════════════════')
  console.log('  ACCESS REPORT — How to enter each hotel dashboard')
  console.log('═══════════════════════════════════════════════════════\n')

  for (const hotel of demoHotels) {
    console.log(`  🏨 ${hotel.name}`)
    console.log(`     Plan: ${hotel.plan.toUpperCase()}`)
    console.log(`     URL:  http://localhost:3000/software/onboarding`)
    console.log(`     Email: ${hotel.email}`)
    console.log(`     Password: Demo1234!`)
    console.log(`     → Login creates account → auto-redirects to /dashboard`)
    console.log()
  }

  console.log('  Note: If hotels already exist (duplicate name), they are skipped.')
  console.log('  To reset: delete hotels from Supabase dashboard and re-run.\n')
}

seed().catch(console.error)
