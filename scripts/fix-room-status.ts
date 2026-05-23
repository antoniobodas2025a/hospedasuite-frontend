/**
 * Fix: Update room status from 'available' to 'active' for all demo hotels.
 * The seed script originally used 'available' but the OTA page filters for 'active'.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  console.log('Fixing room statuses...\n')

  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, name, status, hotel_id')
    .eq('status', 'available')

  if (error) {
    console.error('Error fetching rooms:', error.message)
    process.exit(1)
  }

  if (!rooms || rooms.length === 0) {
    console.log('No rooms with status "available" found. Nothing to fix.')
    return
  }

  console.log(`Found ${rooms.length} rooms with status "available":`)
  rooms.forEach(r => console.log(`  - ${r.name} (${r.id})`))

  const { error: updateError } = await supabase
    .from('rooms')
    .update({ status: 'active' })
    .eq('status', 'available')

  if (updateError) {
    console.error('Error updating rooms:', updateError.message)
    process.exit(1)
  }

  console.log(`\n✅ Updated ${rooms.length} rooms to status "active"`)
}

main()
