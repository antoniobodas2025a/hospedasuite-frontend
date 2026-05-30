export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, GeocodeError } from '@/lib/geocoding-service';

// ─── Request Schema ──────────────────────────────────────────────────────────

interface GeocodeRequest {
  address: string;
  city: string;
  country?: string;
}

function validateBody(body: unknown): GeocodeRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Cuerpo de solicitud inválido');
  }

  const data = body as Record<string, unknown>;

  if (typeof data.address !== 'string' || data.address.trim().length === 0) {
    throw new Error('La dirección es requerida');
  }
  if (typeof data.city !== 'string' || data.city.trim().length === 0) {
    throw new Error('La ciudad es requerida');
  }

  return {
    address: data.address.trim(),
    city: data.city.trim(),
    country: typeof data.country === 'string' ? data.country.trim() : undefined,
  };
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { address, city, country } = validateBody(body);

    const result = await geocodeAddress(address, city, country);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof GeocodeError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: 422 },
      );
    }

    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    console.error('[API/GEOCODE] Error:', message);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar la solicitud de geocodificación',
        code: 'INTERNAL_ERROR',
      },
      { status: 400 },
    );
  }
}
