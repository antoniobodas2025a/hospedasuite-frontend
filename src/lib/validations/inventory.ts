import { z } from 'zod';

// Este es el ESQUEMA DEFINTIVO para tu Backend/Server Actions
export const RoomSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 letras"),
  capacity: z.number().min(1).max(20),
  price: z.number().min(0, "El precio no puede ser negativo"),
  status: z.enum(['active', 'maintenance', 'trial']).default('active'),
  size_sqm: z.number().optional(),
  
  // Validación estricta para la galería estructurada JSONB
  gallery: z.array(z.object({
    url: z.string().url("Debe ser una URL válida"),
    alt: z.string().max(100),
    order: z.number()
  })).max(10, "Máximo 10 fotos por habitación").default([]),
  
  // Tipado estricto de amenidades JSONB
  amenities: z.array(z.object({
    id: z.string(),
    isFree: z.boolean().default(true),
    details: z.string().optional()
  })).default([])
});

export type RoomFormValues = z.infer<typeof RoomSchema>;