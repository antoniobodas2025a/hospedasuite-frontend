/**
 * QR Code Generation API
 *
 * Generates actual QR code images server-side using the 'qrcode' library.
 * Returns PNG image data as base64 or binary stream.
 */

export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const data = searchParams.get('data')

  if (!data) {
    return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 })
  }

  try {
    // Generate QR code as base64 PNG
    const qrImage = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })

    return NextResponse.json({
      success: true,
      qrImage, // base64 data URL
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'QR generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { data } = body

    if (!data) {
      return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 })
    }

    const qrImage = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })

    return NextResponse.json({
      success: true,
      qrImage,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'QR generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
