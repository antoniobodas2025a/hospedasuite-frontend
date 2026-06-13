// ============================================================================
// KLAVIYO MCP — Integración Real con API v2
// ============================================================================

export interface KlaviyoPayload {
  email: string;
  phone?: string;
  properties: {
    city?: string;
    roomCount: number;
    attackLine: string;
    [key: string]: any;
  };
}

export async function pushToKlaviyoMcp(payload: KlaviyoPayload) {
  const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY;
  const KLAVIYO_LIST_ID = process.env.KLAVIYO_LIST_ID || 'T5X5X5'; // ID por defecto de la lista "Leads Boyacá"

  if (!KLAVIYO_API_KEY) {
    console.error('[Klaviyo] API Key missing. Data not sent.');
    return { success: false, error: 'Missing API Key' };
  }

  try {
    const response = await fetch('https://a.klaviyo.com/api/profile-subscriptions/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        'Content-Type': 'application/json',
        'revision': '2023-02-22',
      },
      body: JSON.stringify({
        data: {
          type: 'profile-subscription',
          attributes: {
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: payload.email,
                  phone_number: payload.phone,
                  properties: {
                    source: 'HospedaSuite Landing',
                    city: payload.properties.city,
                    room_count: payload.properties.roomCount,
                    attack_line: payload.properties.attackLine,
                  },
                },
              },
            },
          },
          relationships: {
            list: {
              data: { type: 'list', id: KLAVIYO_LIST_ID },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Klaviyo API Error: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('[Klaviyo] Integration failed:', error);
    return { success: false, error };
  }
}

/**
 * Enrolls a profile in a specific Klaviyo Flow (e.g., Escudo Legal)
 * Updates profile properties and triggers flow entry.
 */
export async function enrollInKlaviyoFlow(
  email: string,
  flowId: string,
  properties: Record<string, any> = {}
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.KLAVIYO_API_KEY;
  if (!apiKey) {
    console.warn('[Klaviyo MCP] API Key not configured for flow enrollment.');
    return { success: false, error: 'Missing API Key' };
  }

  try {
    const response = await fetch(`https://a.klaviyo.com/api/flows/${flowId}/flow-actions/subscribe`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: '2024-05-15',
      },
      body: JSON.stringify({
        data: {
          type: 'flow-action-subscribe',
          attributes: {
            profile: {
              data: {
                type: 'profile',
                attributes: { email, properties },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.detail || 'Flow enrollment failed' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Network error during flow enrollment' };
  }
}
