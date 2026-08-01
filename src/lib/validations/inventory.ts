import * as z from "zod";

/**
 * 🛡️ CONTRATO DE INVENTARIO TIER-1 (HYBRID MODE)
 * Resolución de error de grabación: Soporta URLs directas (WebP) y Objetos Legacy.
 */
export const RoomSchema = z.object({
  name: z.string().min(1, "El nombre de la habitación es obligatorio."),
  
  capacity: z.number().min(1, "La capacidad debe ser al menos 1 persona."),
  
  price: z.number().min(0, "El precio no puede ser negativo."),
  
  description: z.string().optional().nullable(),
  
  // 🛡️ Mantenemos el Enum para evitar inconsistencias en la lógica de UI
  // Se incluye 'available' por compatibilidad con datos históricos de la BD
  status: z.enum(['active', 'available', 'maintenance', 'dirty', 'clean', 'occupied']).default('active'),
  
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
  // Los preprocesos hacen que campos vacíos/undefined/NaN sean realmente opcionales,
  // evitando el bug donde un select sin tocar bloqueaba el guardado.
  bed_type: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : val),
    z.enum(['sencilla', 'doble', 'queen', 'king'], {
      invalid_type_error: "Selecciona un tipo de cama válido.",
    }).optional()
  ),
  beds: z.preprocess(
    (val) => (val === '' || val === undefined || val === null || (typeof val === 'number' && isNaN(val)) ? null : val),
    z.number().min(1, "Debe tener al menos 1 cama.").max(10, "No puede tener más de 10 camas.").nullable()
  ),
  
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