import { NextRequest, NextResponse } from 'next/server';
import { evaluateTrendPayload, TrendPayload } from '@/lib/trend-jacking';
import { pushToKlaviyoMcp } from '@/lib/klaviyo-mcp';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate payload structure
    const payload: TrendPayload = {
      source: body.source,
      text: body.text,
      author: body.author,
      location: body.location,
      url: body.url,
      timestamp: body.timestamp,
      sentiment: body.sentiment,
    };

    const result = evaluateTrendPayload(payload);

    // If crisis detected in Boyacá-Centro, trigger Klaviyo MCP
    if (result.action === 'dispatched' && result.klaviyo_triggered) {
      try {
        await pushToKlaviyoMcp({
          email: body.author_email || 'rescate@hospedasuite.com',
          properties: {
            city: body.location || 'Boyacá-Centro',
            roomCount: 0,
            attackLine: 'RESCATE_OPERATIVO',
            crisis_source: payload.source,
            crisis_url: payload.url || '',
            crisis_text_snippet: payload.text.slice(0, 200),
          },
        });
      } catch {
        // Klaviyo failure should not block the webhook response
        console.error('[Trend-Webhook] Klaviyo MCP dispatch failed');
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, action: 'invalid', reason: 'Malformed JSON payload' },
      { status: 400 }
    );
  }
}
