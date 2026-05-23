import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('Fixing gallery_urls format...\n')

  // Get all active hotels
  const { data: hotels, error } = await supabase
    .from('hotels')
    .select('id, name, slug, gallery_urls')
    .eq('status', 'active')

  if (error || !hotels) {
    console.error('Error:', error?.message)
    process.exit(1)
  }

  console.log(`Found ${hotels.length} active hotels\n`)

  for (const hotel of hotels) {
    const raw = hotel.gallery_urls
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      console.log(`  ⏭️  ${hotel.name}: no gallery_urls`)
      continue
    }

    // Check if URLs are stringified JSON objects
    const fixedUrls: string[] = []
    let needsFix = false

    for (const item of raw) {
      if (typeof item === 'string') {
        // Could be a plain URL or a stringified JSON object
        if (item.startsWith('{')) {
          // Stringified JSON object
          try {
            const parsed = JSON.parse(item)
            if (parsed.url) {
              fixedUrls.push(parsed.url)
              needsFix = true
            }
          } catch {
            // Not valid JSON, treat as URL
            fixedUrls.push(item)
          }
        } else {
          // Plain URL string
          fixedUrls.push(item)
        }
      } else if (typeof item === 'object' && item !== null) {
        // Already an object with url property
        if (item.url) {
          fixedUrls.push(item.url)
          needsFix = true
        }
      }
    }

    if (needsFix) {
      console.log(`  🔧 ${hotel.name}: fixing ${fixedUrls.length} gallery URLs`)
      const { error: updateError } = await supabase
        .from('hotels')
        .update({ gallery_urls: fixedUrls })
        .eq('id', hotel.id)

      if (updateError) {
        console.error(`  ❌ Error updating ${hotel.name}:`, updateError.message)
      } else {
        console.log(`  ✅ ${hotel.name}: updated`)
      }
    } else {
      console.log(`  ✓ ${hotel.name}: already correct (${fixedUrls.length} URLs)`)
    }
  }

  console.log('\n✅ Done!')
}

main()
