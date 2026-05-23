import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: hotel, error } = await supabase
    .from('hotels')
    .select('id, name, slug, logo_url, main_image_url, cover_photo_url, gallery_urls')
    .eq('slug', 'hostal-la-candelaria')
    .single()

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log('Hotel:', hotel?.name)
  console.log('logo_url:', hotel?.logo_url)
  console.log('main_image_url:', hotel?.main_image_url)
  console.log('cover_photo_url:', hotel?.cover_photo_url)
  console.log('gallery_urls:', JSON.stringify(hotel?.gallery_urls, null, 2))
}

main()
