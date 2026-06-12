import * as z from "zod";

/**
 * 🛡️ CONTRATO DE INVENTARIO TIER-1 (HYBRID MODE)
 * Resolución de error de grabación: Soporta URLs directas (WebP) y Objetos Legacy.
 */
export const RoomSchema = z.object({
  name: z.string().min(1, "El nombre/número de unidad es obligatorio."),
  
  capacity: z.number().min(1, "Aforo mínimo: 1 PAX."),
  
  price: z.number().min(0, "La tarifa no puede ser negativa."),
  
  description: z.string().optional().nullable(),
  
  // 🛡️ Mantenemos el Enum para evitar inconsistencias en la lógica de UI
  status: z.enum(['active', 'maintenance', 'dirty', 'clean', 'occupied']).default('active'),
  
  // 🚨 REPARACIÓN CRÍTICA: Unión de tipos para evitar el bloqueo de grabación.
  // Acepta: "https://..." O { url: "https://...", alt: "..." }
  gallery: z.array(
    z.union([
      z.string().url(),
      z.object({
        url: z.string().url(),
        alt: z.string().optional(),
        order: z.number().optional()
      })
    ])
  ).default([]),
  
  amenities: z.array(z.string()).default([]),
  
  // 🛏️ Configuración de cama (migration 022)
  bed_type: z.enum(['sencilla', 'doble', 'queen', 'king']).optional(),
  beds: z.number().min(1).max(10).optional().nullable(),
  
  // 🌐 Sincronización Channel (Null-safe)
  ical_import_url: z.string()
    .url("Formato de URL iCal no válido.")
    .or(z.literal(""))
    .optional()
    .nullable(),
    
  size_sqm: z.number().optional().nullable(),
});

// Extracción determinista de tipos para el motor de HospedaSuite
export type RoomFormValues = z.infer<typeof RoomSchema>;