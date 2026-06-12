/**
 * Alegra Connector - Electronic Invoicing Integration
 * 
 * "Bring Your Own" model: Hotelier connects their existing Alegra account.
 * Uses Basic Auth (email:token in base64) as per Alegra API docs.
 * 
 * API Docs: https://developer.alegra.com/
 * Rate Limit: 150 requests/minute per user
 */

export interface AlegraConfig {
  email: string;
  token: string;
  baseUrl: string;
}

export interface AlegraInvoicePayload {
  date: string; // yyyy-MM-dd
  dueDate: string; // yyyy-MM-dd
  client: { id: string }; // Alegra contact ID
  items: Array<{
    id: string; // Alegra item ID
    price: number;
    quantity: number;
    description?: string;
  }>;
  payments?: Array<{
    date: string;
    account: { id: string };
    amount: number;
    paymentMethod: 'cash' | 'transfer' | 'credit-card' | 'debit-card';
  }>;
  status?: 'open' | 'draft';
  stamp?: { generateStamp: boolean }; // For electronic invoicing in Colombia
}

export interface AlegraContactPayload {
  name: string;
  identification: string;
  email?: string;
  phone?: string;
  type: 'person' | 'company';
}

/**
 * Creates Basic Auth header for Alegra API
 */
function createAlegraAuthHeader(config: AlegraConfig): string {
  const credentials = `${config.email}:${config.token}`;
  const base64 = Buffer.from(credentials).toString('base64');
  return `Basic ${base64}`;
}

/**
 * Generic API call to Alegra
 */
async function alegraApiCall<T>(
  config: AlegraConfig,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  try {
    const url = `${config.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': createAlegraAuthHeader(config),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `API Error ${response.status}`,
        status: response.status,
      };
    }

    return { success: true, data: data as T, status: response.status };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Test Alegra connection
 */
export async function testAlegraConnection(config: AlegraConfig): Promise<{ success: boolean; error?: string }> {
  const result = await alegraApiCall(config, '/company', 'GET');
  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Create or find a contact in Alegra
 */
export async function createOrFindAlegraContact(
  config: AlegraConfig,
  contact: AlegraContactPayload
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  // First, try to find existing contact by identification
  const searchResult = await alegraApiCall<any[]>(
    config,
    `/contacts?identification=${encodeURIComponent(contact.identification)}`,
    'GET'
  );

  if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
    return { success: true, contactId: searchResult.data[0].id };
  }

  // Create new contact
  const createResult = await alegraApiCall<any>(
    config,
    '/contacts',
    'POST',
    contact
  );

  if (createResult.success && createResult.data) {
    return { success: true, contactId: createResult.data.id };
  }

  return { success: false, error: createResult.error };
}

/**
 * Create an invoice in Alegra
 */
export async function createAlegraInvoice(
  config: AlegraConfig,
  invoice: AlegraInvoicePayload
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  const result = await alegraApiCall<any>(
    config,
    '/invoices',
    'POST',
    invoice
  );

  if (result.success && result.data) {
    return { success: true, invoiceId: result.data.id };
  }

  return { success: false, error: result.error };
}

/**
 * Create an electronic invoice in Alegra (Colombia)
 * Automatically stamps the invoice for DIAN compliance
 */
export async function createElectronicInvoice(
  config: AlegraConfig,
  invoice: AlegraInvoicePayload
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  // Add stamp for electronic invoicing
  const electronicInvoice = {
    ...invoice,
    stamp: { generateStamp: true },
    status: 'open' as const,
  };

  return createAlegraInvoice(config, electronicInvoice);
}

/**
 * Get Alegra items (products/services)
 */
export async function getAlegraItems(config: AlegraConfig): Promise<{ success: boolean; items?: any[]; error?: string }> {
  const result = await alegraApiCall<any[]>(config, '/items', 'GET');
  return {
    success: result.success,
    items: result.data,
    error: result.error,
  };
}

/**
 * Create a service item in Alegra (e.g., "Hospedaje")
 */
export async function createAlegraItem(
  config: AlegraConfig,
  name: string,
  price: number = 0,
  description: string = ''
): Promise<{ success: boolean; itemId?: string; error?: string }> {
  const itemPayload = {
    name,
    description: description || `Servicio de ${name}`,
    price: [{ price: price || 1 }], // Alegra requires at least one price
    inventory: {
      unit: 'unit',
      availableQuantity: 999999,
    },
    category: { name: 'Servicios' },
  };

  const result = await alegraApiCall<any>(config, '/items', 'POST', itemPayload);

  if (result.success && result.data) {
    return { success: true, itemId: result.data.id };
  }

  return { success: false, error: result.error };
}

/**
 * Ensure "Hospedaje" item exists in Alegra account
 * Creates it automatically if not found
 */
export async function ensureHospedajeItemExists(
  config: AlegraConfig
): Promise<{ success: boolean; itemId?: string; error?: string; created?: boolean }> {
  // First, try to find existing item
  const itemsResult = await getAlegraItems(config);
  if (itemsResult.success && itemsResult.items) {
    const hospedajeItem = itemsResult.items.find(
      (item: any) => item.name?.toLowerCase().includes('hospedaje') || item.name?.toLowerCase().includes('alojamiento')
    );
    if (hospedajeItem) {
      return { success: true, itemId: hospedajeItem.id, created: false };
    }
  }

  // Create "Hospedaje" item
  const createResult = await createAlegraItem(
    config,
    'Hospedaje',
    0, // Price will be set per invoice
    'Servicio de hospedaje por noche'
  );

  return {
    success: createResult.success,
    itemId: createResult.itemId,
    error: createResult.error,
    created: createResult.success,
  };
}

/**
 * Get Alegra contacts
 */
export async function getAlegraContacts(config: AlegraConfig): Promise<{ success: boolean; contacts?: any[]; error?: string }> {
  const result = await alegraApiCall<any[]>(config, '/contacts', 'GET');
  return {
    success: result.success,
    contacts: result.data,
    error: result.error,
  };
}
