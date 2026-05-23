import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: hotels, error } = await supabase
    .from('hotels')
    .select('id, name, slug, status, main_image_url, cover_photo_url, gallery_urls')
    .eq('slug', 'refugio-glamping-sierra')
    .single()

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log('Hotel:', hotels?.name)
  console.log('Status:', hotels?.status)
  console.log('main_image_url:', hotels?.main_image_url)
  console.log('cover_photo_url:', hotels?.cover_photo_url)
  console.log('gallery_urls:', JSON.stringify(hotels?.gallery_urls, null, 2))
  console.log('gallery_urls is array:', Array.isArray(hotels?.gallery_urls))
  console.log('gallery_urls length:', Array.isArray(hotels?.gallery_urls) ? hotels!.gallery_urls.length : 'N/A')
}

main()
