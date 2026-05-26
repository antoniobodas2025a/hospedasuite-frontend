import { z } from 'zod';

// Step 1: Hotel Identity
export const hotelIdentitySchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  city: z.string().min(2, 'La ciudad es requerida'),
  location: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  description: z.string().optional(),
  category: z.string().optional(),
  propertyType: z.enum(['hotel', 'glamping', 'cabanas', 'hostal', 'apartamento'] as const),
});

// Step 2: Property Gallery (handled by upload action, just track count)
export const propertyGallerySchema = z.object({
  images: z.array(z.string()).min(3, 'Se requieren al menos 3 fotos'),
});

// Step 3: Property Type (already covered in Step 1 schema)

// Step 4: Room Draft
export const roomDraftSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, 'El nombre de la habitación es requerido'),
  type: z.string().optional(),
  price: z.number().min(1, 'El precio debe ser mayor a 0'),
  description: z.string().optional(),
  amenities: z.array(z.string()).default([]),
  capacity: z.number().min(1).optional(),
  beds: z.number().min(1).optional(),
  bedType: z.enum(['individual', 'doble', 'queen', 'king', 'litera']).optional(),
  bathroomType: z.enum(['privado', 'compartido', 'en-suite', 'exterior']).optional(),
  showerType: z.enum(['ducha', 'bañera', 'ambos', 'ninguno']).optional(),
  hotWater: z.boolean().optional(),
  roomSize: z.enum(['pequeno', 'mediano', 'grande', 'suite']).optional(),
  roomView: z.enum(['interior', 'exterior', 'jardin', 'mar', 'montana', 'ciudad']).optional(),
  imageUrls: z.array(z.string()).default([]),
  availabilityRange: z.object({
    from: z.string(),
    to: z.string(),
  }).optional().nullable(),
});

// Step 4: Rooms List
export const roomsListSchema = z.object({
  rooms: z.array(roomDraftSchema).min(1, 'Se requiere al menos una habitación'),
});

// Step 5: Settings
export const settingsSchema = z.object({
  amenities: z.array(z.string()).default([]),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  whatsappNumber: z.string().optional(),
  googleMapsUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  taxRate: z.number().min(0).max(0.19).default(0),
});

// Step 6: Payment
export const paymentSchema = z.object({
  planId: z.string().optional().nullable(),
  price: z.number().min(0),
  transactionId: z.string().optional().nullable(),
  paymentMethod: z.enum(['wompi', 'manual']).nullable(),
  manualReceiptUrl: z.string().nullable(),
});

// Full wizard state schema (for provisioning)
export const fullWizardStateSchema = z.object({
  hotelIdentity: hotelIdentitySchema,
  galleryImages: z.array(z.string()),
  rooms: z.array(roomDraftSchema).min(1),
  settings: settingsSchema,
  payment: paymentSchema,
});

export type HotelIdentityData = z.infer<typeof hotelIdentitySchema>;
export type RoomDraftData = z.infer<typeof roomDraftSchema>;
export type SettingsData = z.infer<typeof settingsSchema>;
export type PaymentData = z.infer<typeof paymentSchema>;
export type PaymentMethod = NonNullable<PaymentData['paymentMethod']>;
export type FullWizardState = z.infer<typeof fullWizardStateSchema>;
