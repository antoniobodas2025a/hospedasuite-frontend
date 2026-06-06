import { create } from "zustand";
import { PropertyType } from "@/lib/room-templates";
import { getTemplateById } from "@/lib/room-templates";
import {
	hotelIdentitySchema,
	settingsSchema,
	roomDraftSchema,
	HotelIdentityData,
	RoomDraftData,
	SettingsData,
	PaymentMethod,
} from "@/lib/onboarding-schemas";

export interface RoomDraft extends RoomDraftData {
	imageFiles: File[];
	imagePreviews: string[];
}

export interface OnboardingState {
	// Navigation
	currentStep: number;
	maxCompletedStep: number;
	hotelId: string | null;

	// Step 1: Identity
	hotelIdentity: HotelIdentityData;
	logoFile: File | null;
	logoPreview: string | null;
	coverPhotoFile: File | null;
	coverPhotoPreview: string | null;

	// Step 2: Gallery
	galleryImages: string[];
	galleryFiles: File[];
	galleryPreviews: string[];

	// Step 4: Rooms
	rooms: RoomDraft[];

	// Step 5: Settings
	settings: SettingsData;

	// Step 6: Payment
	paymentPlan: string | null;
	paymentPrice: number;
	paymentTransactionId: string | null;
	paymentMethod: PaymentMethod | null;
	manualReceiptUrl: string | null;

	// State
	isSubmitting: boolean;
	error: string | null;
	validationErrors: Record<string, string>;
	isProvisioning: boolean;

	// Actions
	setCurrentStep: (step: number) => void;
	setMaxCompletedStep: (step: number) => void;
	setHotelId: (id: string | null) => void;

	// Step 1 actions
	updateHotelIdentity: (data: Partial<HotelIdentityData>) => void;
	setLogo: (file: File | null, preview: string | null) => void;
	setCoverPhoto: (file: File | null, preview: string | null) => void;

	// Step 2 actions
	setGalleryImages: (files: File[], previews: string[]) => void;
	removeGalleryImage: (index: number) => void;

	// Step 4 actions
	addRoomFromTemplate: (propertyType: PropertyType, templateId: string) => void;
	addEmptyRoom: () => void;
	updateRoom: (roomId: string, data: Partial<RoomDraft>) => void;
	removeRoom: (roomId: string) => void;
	setRoomImages: (roomId: string, files: File[], previews: string[]) => void;
	removeRoomImage: (roomId: string, index: number) => void;

	// Step 5 actions
	updateSettings: (data: Partial<SettingsData>) => void;

	// Step 6 actions
	setPaymentInfo: (plan: string | null, price: number) => void;
	setPaymentTransactionId: (id: string | null) => void;
	setPaymentMethod: (method: PaymentMethod | null) => void;
	setManualReceiptUrl: (url: string | null) => void;

	// General
	setIsSubmitting: (value: boolean) => void;
	setError: (error: string | null) => void;
	setValidationErrors: (errors: Record<string, string>) => void;
	startProvisioning: () => void;
	reset: () => void;

	// Step validation — returns { valid: boolean, errors: string[] }
	validateStep: (step: number) => { valid: boolean; errors: string[] };
}

const defaultHotelIdentity: HotelIdentityData = {
	name: "",
	city: "",
	location: "",
	propertyType: "hotel",
};

const defaultSettings: SettingsData = {
	amenities: [],
	checkInTime: "15:00",
	checkOutTime: "11:00",
	taxRate: 0.19,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
	currentStep: 1,
	maxCompletedStep: 0,
	hotelId: null,

	hotelIdentity: defaultHotelIdentity,
	logoFile: null,
	logoPreview: null,
	coverPhotoFile: null,
	coverPhotoPreview: null,

	galleryImages: [],
	galleryFiles: [],
	galleryPreviews: [],

	rooms: [],

	settings: defaultSettings,

	paymentPlan: null,
	paymentPrice: 89900,
	paymentTransactionId: null,
	paymentMethod: null,
	manualReceiptUrl: null,

	isSubmitting: false,
	error: null,
	validationErrors: {},
	isProvisioning: false,

	setCurrentStep: (step) => set({ currentStep: step }),
	setMaxCompletedStep: (step) => set({ maxCompletedStep: step }),
	setHotelId: (id) => set({ hotelId: id }),

	updateHotelIdentity: (data) =>
		set((state) => {
			const updated = { ...state.hotelIdentity, ...data };
			const result = hotelIdentitySchema.safeParse(updated);
			const errors: Record<string, string> = result.success
				? {}
				: { identity: result.error.issues[0]?.message || "Datos inválidos" };
			return { hotelIdentity: updated, validationErrors: errors };
		}),

	setLogo: (file, preview) => set({ logoFile: file, logoPreview: preview }),
	setCoverPhoto: (file, preview) =>
		set({ coverPhotoFile: file, coverPhotoPreview: preview }),

	setGalleryImages: (files, previews) =>
		set((state) => {
			const maxGallery = 8;
			const remaining = maxGallery - state.galleryFiles.length;
			// Dedup: skip files already in the gallery by name + size
			const existingKeys = new Set(
				state.galleryFiles.map((f) => `${f.name}|${f.size}`),
			);
			const uniqueEntries = files
				.map((f, i) => ({ file: f, preview: previews[i] }))
				.filter(({ file }) => !existingKeys.has(`${file.name}|${file.size}`));
			const toAdd = uniqueEntries.slice(0, remaining).map((e) => e.file);
			const toAddPreviews = uniqueEntries
				.slice(0, remaining)
				.map((e) => e.preview);
			return {
				galleryFiles: [...state.galleryFiles, ...toAdd],
				galleryPreviews: [...state.galleryPreviews, ...toAddPreviews],
				galleryImages: [...state.galleryImages, ...toAddPreviews],
			};
		}),

	removeGalleryImage: (index) =>
		set((state) => {
			const newFiles = [...state.galleryFiles];
			const newPreviews = [...state.galleryPreviews];
			newFiles.splice(index, 1);
			newPreviews.splice(index, 1);
			return {
				galleryFiles: newFiles,
				galleryPreviews: newPreviews,
				galleryImages: newPreviews,
			};
		}),

	addRoomFromTemplate: (propertyType, templateId) =>
		set((state) => {
			const template = getTemplateById(propertyType, templateId);
			if (!template) return state;

			const newRoom: RoomDraft = {
				id: crypto.randomUUID(),
				name: template.name,
				type: template.name,
				price: template.priceRange[0],
				description: template.description,
				amenities: template.suggestedAmenities,
				capacity: template.defaultCapacity,
				beds: template.defaultBeds,
				bedType: "queen",
				bathroomType: "privado",
				showerType: "ducha",
				hotWater: true,
				roomView: "exterior",
				imageUrls: [],
				imageFiles: [],
				imagePreviews: [],
				availabilityRange: null,
			};

			return { rooms: [...state.rooms, newRoom] };
		}),

	addEmptyRoom: () =>
		set((state) => ({
			rooms: [
				...state.rooms,
				{
					id: crypto.randomUUID(),
					name: "",
					price: 0,
					amenities: [],
					capacity: 2,
					beds: 1,
					bedType: "queen",
					bathroomType: "privado",
					showerType: "ducha",
					hotWater: true,
					roomView: "exterior",
					imageUrls: [],
					imageFiles: [],
					imagePreviews: [],
					availabilityRange: null,
				},
			],
		})),

	updateRoom: (roomId, data) =>
		set((state) => ({
			rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, ...data } : r)),
		})),

	removeRoom: (roomId) =>
		set((state) => ({
			rooms: state.rooms.filter((r) => r.id !== roomId),
		})),

	setRoomImages: (roomId, files, previews) =>
		set((state) => ({
			rooms: state.rooms.map((r) =>
				r.id === roomId
					? { ...r, imageFiles: files, imagePreviews: previews }
					: r,
			),
		})),

	removeRoomImage: (roomId, index) =>
		set((state) => ({
			rooms: state.rooms.map((r) => {
				if (r.id !== roomId) return r;
				const newFiles = [...r.imageFiles];
				const newPreviews = [...r.imagePreviews];
				newFiles.splice(index, 1);
				newPreviews.splice(index, 1);
				return { ...r, imageFiles: newFiles, imagePreviews: newPreviews };
			}),
		})),

	updateSettings: (data) =>
		set((state) => {
			const updated = { ...state.settings, ...data };
			const result = settingsSchema.safeParse(updated);
			const errors: Record<string, string> = result.success
				? {}
				: { settings: result.error.issues[0]?.message || "Datos inválidos" };
			return { settings: updated, validationErrors: errors };
		}),

	setPaymentInfo: (plan, price) =>
		set({ paymentPlan: plan, paymentPrice: price }),
	setPaymentTransactionId: (id) => set({ paymentTransactionId: id }),
	setPaymentMethod: (method) => set({ paymentMethod: method }),
	setManualReceiptUrl: (url) => set({ manualReceiptUrl: url }),

	setIsSubmitting: (value) => set({ isSubmitting: value }),
	setError: (error) => set({ error }),
	setValidationErrors: (errors) => set({ validationErrors: errors }),
	startProvisioning: () => set({ isProvisioning: true }),

	validateStep: (step) => {
		const errors: string[] = [];

		if (step === 1) {
			const state = useOnboardingStore.getState();
			const result = hotelIdentitySchema.safeParse(state.hotelIdentity);
			if (!result.success) {
				result.error.issues.forEach((i) => errors.push(i.message));
			}
		}

		if (step === 2) {
			const state = useOnboardingStore.getState();
			if (state.galleryPreviews.length < 3) {
				errors.push(
					`Necesitás al menos 3 fotos (tenés ${state.galleryPreviews.length})`,
				);
			}
		}

		if (step === 4) {
			const state = useOnboardingStore.getState();
			if (state.rooms.length === 0) {
				errors.push("Necesitás al menos 1 habitación");
			} else {
				state.rooms.forEach((room, i) => {
					// Validate structural fields only; imagePreviews are blob: URLs
					// that will be replaced by real R2 URLs during provisioning.
					// URL format validation happens at provisioning time (server-side).
					const result = roomDraftSchema.safeParse({
						id: room.id,
						name: room.name,
						price: room.price,
						amenities: room.amenities || [],
						imageUrls: [], // Real URLs don't exist yet
					});
					if (!result.success) {
						result.error.issues.forEach((issue) => {
							errors.push(`Habitación ${i + 1}: ${issue.message}`);
						});
					}
					// Enforce at least 1 image per room
					if (room.imageFiles.length === 0) {
						errors.push(
							`Habitación ${i + 1} (${room.name}): necesita al menos 1 foto`,
						);
					}
				});
			}
		}

		return { valid: errors.length === 0, errors };
	},

	reset: () =>
		set({
			currentStep: 1,
			maxCompletedStep: 0,
			hotelIdentity: defaultHotelIdentity,
			logoFile: null,
			logoPreview: null,
			coverPhotoFile: null,
			coverPhotoPreview: null,
			galleryFiles: [],
			galleryPreviews: [],
			galleryImages: [],
			rooms: [],
			settings: defaultSettings,
			paymentPlan: null,
			paymentPrice: 89900,
			paymentTransactionId: null,
			paymentMethod: null,
			manualReceiptUrl: null,
			isSubmitting: false,
			error: null,
			validationErrors: {},
			isProvisioning: false,
		}),
}));
