import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const USER_ID = '9680641f-fe03-4acb-942a-5e62a9392bab'

async function main() {
  console.log('Checking user:', USER_ID)

  // 1. Check staff records
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('id, hotel_id, user_id, role')
    .eq('user_id', USER_ID)

  console.log('\n--- Staff records ---')
  console.log('Error:', staffError?.message)
  console.log('Count:', staff?.length || 0)
  staff?.forEach(s => console.log(`  hotel_id: ${s.hotel_id}, role: ${s.role}`))

  // 2. Check hotels without owner_id
  const { data: orphanHotels, error: hotelError } = await supabase
    .from('hotels')
    .select('id, name, slug, owner_id, status, created_at')
    .is('owner_id', null)
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('\n--- Orphan hotels (no owner_id) ---')
  console.log('Error:', hotelError?.message)
  console.log('Count:', orphanHotels?.length || 0)
  orphanHotels?.forEach(h => console.log(`  ${h.name} (${h.slug}) — id: ${h.id} — ${h.created_at}`))

  // 3. Check hotels owned by this user
  const { data: userHotels } = await supabase
    .from('hotels')
    .select('id, name, slug, owner_id, status, created_at')
    .eq('owner_id', USER_ID)
    .order('created_at', { ascending: false })

  console.log('\n--- Hotels owned by user ---')
  console.log('Count:', userHotels?.length || 0)
  userHotels?.forEach(h => console.log(`  ${h.name} (${h.slug}) — id: ${h.id} — status: ${h.status}`))

  // FIX: If there's an orphan hotel created recently, link it to the user
  if (orphanHotels && orphanHotels.length > 0 && (!userHotels || userHotels.length === 0)) {
    const orphan = orphanHotels[0]
    console.log(`\n🔧 Linking orphan hotel "${orphan.name}" to user...`)
    
    const { error: updateError } = await supabase
      .from('hotels')
      .update({ owner_id: USER_ID })
      .eq('id', orphan.id)
    
    if (updateError) {
      console.error('❌ Error:', updateError.message)
    } else {
      console.log('✅ Hotel linked!')
    }

    // Also ensure staff record exists
    if (!staff || staff.length === 0) {
      console.log('🔧 Creating staff record...')
      const { error: staffInsertError } = await supabase
        .from('staff')
        .insert({
          user_id: USER_ID,
          hotel_id: orphan.id,
          role: 'admin',
          name: orphan.name,
          pin_code: String(Math.floor(100000 + Math.random() * 900000)),
        })
      
      if (staffInsertError) {
        console.error('❌ Staff error:', staffInsertError.message)
      } else {
        console.log('✅ Staff record created!')
      }
    }
  }
}

main()
