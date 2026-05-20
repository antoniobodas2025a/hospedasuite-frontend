/**
 * QR Code Generation API
 *
 * Returns QR code data for client-side generation.
 * The client uses a QR library (e.g., qrcode.react) to render the QR code.
 *
 * This approach avoids server-side dependencies and keeps the bundle small.
 */

export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const data = searchParams.get('data')

  if (!data) {
    return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    qrData: data,
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { data } = body

    if (!data) {
      return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      qrData: data,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
