import { z } from "zod";
import type { ImageCategory } from "@/types";

// Step 1: Hotel Identity
export const hotelIdentitySchema = z.object({
	name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
	city: z.string().min(2, "La ciudad o municipio es requerido"),
	location: z.string().min(2, "La zona o vereda es requerido"),
	address: z.string().optional(),
	phone: z.string().optional(),
	email: z.string().email("Email inválido").optional().or(z.literal("")),
	description: z.string().optional(),
	category: z.string().optional(),
	propertyType: z.enum([
		"hotel",
		"glamping",
		"cabanas",
		"hostal",
		"apartamento",
	] as const),
	latitude: z.number()
		.min(-90, "Latitud debe estar entre -90 y 90")
		.max(90, "Latitud debe estar entre -90 y 90")
		.optional()
		.nullable(),
	longitude: z.number()
		.min(-180, "Longitud debe estar entre -180 y 180")
		.max(180, "Longitud debe estar entre -180 y 180")
		.optional()
		.nullable(),
});

// Step 2: Property Gallery — categorized images with mandatory category
const VALID_IMAGE_CATEGORIES = [
	"exterior",
	"lobby",
	"habitacion",
	"bano",
	"amenidades",
	"restaurante",
	"entorno",
	"otros",
] as const;

export const imageCategoryEnum = z.custom<ImageCategory>(
	(val) =>
		typeof val === "string" &&
		VALID_IMAGE_CATEGORIES.includes(val as ImageCategory),
	{ message: "Categoría requerida" },
);

export const categorizedImageSchema = z.object({
	url: z
		.string()
		.url()
		.refine(
			(url) =>
				!url.startsWith("blob:") &&
				!url.startsWith("data:") &&
				!url.startsWith("javascript:"),
			"URL de imagen inválida",
		),
	category: imageCategoryEnum,
	alt: z.string().optional(),
	sort_order: z.number().int().min(0).default(0),
	blur_data: z.string().nullable().optional(),
});

export const propertyGallerySchema = z.object({
	images: z
		.array(categorizedImageSchema)
		.min(3, "Se requieren al menos 3 fotos"),
});

// Step 3: Property Type (already covered in Step 1 schema)

// Step 4: Room Draft
export const roomDraftSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(2, "El nombre de la habitación es requerido"),
	type: z.string().optional(),
	price: z.number().min(1, "El precio debe ser mayor a 0"),
	description: z.string().optional(),
	amenities: z.array(z.string()).default([]),
	capacity: z.number().min(1).optional(),
	beds: z.number().min(1).optional(),
	bedType: z
		.enum(["individual", "doble", "queen", "king", "litera"])
		.optional(),
	bathroomType: z
		.enum(["privado", "compartido", "en-suite", "exterior"])
		.optional(),
	showerType: z.enum(["ducha", "bañera", "ambos", "ninguno"]).optional(),
	hotWater: z.boolean().optional(),
	roomView: z
		.enum(["interior", "exterior", "jardin", "mar", "montana", "ciudad"])
		.optional(),
	imageUrls: z
		.array(
			z
				.string()
				.refine(
					(url) =>
						!url.startsWith("blob:") &&
						!url.startsWith("data:") &&
						!url.startsWith("javascript:"),
					"Formato de URL de imagen inválido (no se permiten URLs blob, data, o javascript)",
				),
		)
		.default([]),
	availabilityRange: z
		.object({
			from: z.string(),
			to: z.string(),
		})
		.optional()
		.nullable(),
});

// Step 4: Rooms List
export const roomsListSchema = z.object({
	rooms: z.array(roomDraftSchema).min(1, "Se requiere al menos una habitación"),
});

// Step 5: Settings
export const settingsSchema = z.object({
	amenities: z.array(z.string()).default([]),
	checkInTime: z.string().min(1, "El horario de llegada es requerido"),
	checkOutTime: z.string().min(1, "El horario de salida es requerido"),
	cancellationPolicy: z.string().optional(),
	whatsappNumber: z.string().optional(),
	googleMapsUrl: z.string().url("URL inválida").optional().or(z.literal("")),
	taxRate: z.number().min(0).max(0.19).default(0),
	// Soberanía Financiera: claves de Wompi (opcionales para activación, requeridas post-onboarding)
	wompi_public_key: z.string().optional(),
	wompi_integrity_secret: z.string().optional(),
	wompi_sandbox_mode: z.boolean().default(false),
});

// Step 6: Payment
export const paymentSchema = z.object({
	planId: z.string().optional().nullable(),
	price: z.number().min(0),
	transactionId: z.string().optional().nullable(),
	paymentMethod: z.enum(["wompi", "manual", "free"]).nullable(),
	manualReceiptUrl: z.string().nullable(),
	manualPaymentMethod: z.enum(["nequi", "daviplata"]).nullable().optional(),
});

// Full wizard state schema (for provisioning)
export const fullWizardStateSchema = z.object({
	hotelIdentity: hotelIdentitySchema,
	galleryImages: z.array(
		z
			.string()
			.refine(
				(url) =>
					!url.startsWith("blob:") &&
					!url.startsWith("data:") &&
					!url.startsWith("javascript:"),
				"Formato de URL de imagen inválido (no se permiten URLs blob, data, o javascript)",
			),
	),
	rooms: z.array(roomDraftSchema).min(1),
	settings: settingsSchema,
	payment: paymentSchema,
	paymentTransactionId: z.string().optional().nullable(),
});

export type HotelIdentityData = z.infer<typeof hotelIdentitySchema>;
export type RoomDraftData = z.infer<typeof roomDraftSchema>;
export type SettingsData = z.infer<typeof settingsSchema>;
export type PaymentData = z.infer<typeof paymentSchema>;
export type PaymentMethod = NonNullable<PaymentData["paymentMethod"]>;
export type FullWizardState = z.infer<typeof fullWizardStateSchema>;
export type ImageCategoryEnum = z.infer<typeof imageCategoryEnum>;
export type CategorizedImageData = z.infer<typeof categorizedImageSchema>;
export type PropertyGalleryData = z.infer<typeof propertyGallerySchema>;
