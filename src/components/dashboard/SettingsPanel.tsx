"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });
import {
	Save,
	MessageCircle,
	ShieldAlert,
	ShieldCheck,
	Building,
	CreditCard,
	UploadCloud,
	Users,
	Palette,
	Trash2,
	KeyRound,
	Globe,
	Check,
	Plus,
	AlertOctagon,
	RefreshCcw,
	TrendingUp,
	Clock,
	Eye,
	Star,
	ChevronDown,
	Image as ImageIcon,
	Settings2,
	UtensilsCrossed,
	Copy,
	GripVertical,
} from "lucide-react";
import {
	DndContext,
	closestCenter,
	DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	rectSortingStrategy,
	arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	saveSettingsAction,
	updateHotelProfileAction,
	getPresignedUploadUrlAction,
} from "@/app/actions/settings";
import {
	compressImage,
	generateBlurDataURL,
	uploadToR2,
} from "@/lib/upload-utils";
import { createStaffAction, deleteStaffAction } from "@/app/actions/staff";
import { executeCleanSlateAction } from "@/app/actions/seeding";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { GlassTooltip } from "@/components/ui/GlassTooltip";
import { AMENITY_REGISTRY } from "@/lib/amenity-registry";
import PaymentConnectors from "./PaymentConnectors";

const HOTEL_AMENITIES = Object.values(AMENITY_REGISTRY);

/** Sortable thumbnail for hotel gallery grid */
function SortableGalleryThumb({
	id,
	url,
	index,
	onRemove,
}: {
	id: string;
	url: string;
	index: number;
	onRemove: (i: number) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id });

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
		zIndex: isDragging ? 10 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="relative h-24 rounded-[var(--radius-squircle-lg)] overflow-hidden border border-border group cursor-grab active:cursor-grabbing"
		>
			<img
				src={url}
				alt={`Gallery ${index + 1}`}
				className="w-full h-full object-cover"
				draggable={false}
			/>
			{/* Drag handle */}
			<div
				{...attributes}
				{...listeners}
				className="absolute top-1 left-1 p-0.5 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
			>
				<GripVertical className="size-3 text-white/80" />
			</div>
			{/* Delete overlay */}
			<button
				type="button"
				onClick={() => onRemove(index)}
				className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
			>
				<Trash2 className="size-4 text-rose-400" />
			</button>
			{/* Index badge */}
			<div className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] font-bold px-1 rounded">
				{index + 1}
			</div>
		</div>
	);
}

/**
 * Mac 2026 — Progressive Disclosure Section
 * Complexity emerges only after deliberate interaction.
 */
function DisclosureSection({
	title,
	icon: Icon,
	iconColor,
	description,
	isOpen,
	onToggle,
	children,
}: {
	title: string;
	icon: React.ElementType;
	iconColor: string;
	description?: React.ReactNode;
	isOpen: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className="bg-muted border border-border overflow-hidden transition-all duration-300">
			<button
				type="button"
				onClick={onToggle}
				className="w-full flex items-center justify-between p-8 hover:bg-accent/10 transition-colors"
			>
				<div className="flex items-center gap-3">
					<Icon className={iconColor} />
					<div className="text-left">
						<h3 className="text-xl font-bold">{title}</h3>
						{description && (
							<div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
								{description}
							</div>
						)}
					</div>
				</div>
				<motion.div
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={{ duration: 0.2 }}
				>
					<ChevronDown className="text-muted-foreground" size={20} />
				</motion.div>
			</button>
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
						className="overflow-hidden"
					>
						<div className="px-8 pb-8 border-t border-border pt-6">
							{children}
						</div>
					</motion.div>
					)}
			</AnimatePresence>
		</div>
	);
}

interface SettingsPanelProps {
	initialData: any;
	initialStaff: any[];
}

export default function SettingsPanel({
	initialData,
	initialStaff = [],
}: SettingsPanelProps) {
	const [isSaving, setIsSaving] = useState(false);
	const [isCleaning, setIsCleaning] = useState(false);
	const [copiedSlug, setCopiedSlug] = useState(false);
	const [activeTab, setActiveTab] = useState<
		"general" | "ota" | "staff" | "advanced"
	>("general");
	const [showFiscal, setShowFiscal] = useState(false);
	const [showPayments, setShowPayments] = useState(false);
	const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(
		initialData?.cover_photo_url || null,
	);
	const [mainImagePreview, setMainImagePreview] = useState<string | null>(
		initialData?.main_image_url || null,
	);
	const [galleryPreviews, setGalleryPreviews] = useState<string[]>(
		initialData?.gallery_urls || [],
	);
	const [localStaff, setLocalStaff] = useState(initialStaff);
	const [imageBlurMeta, setImageBlurMeta] = useState<{
		main_image_blur?: string;
		cover_photo_blur?: string;
		gallery_blurs: { url: string; blur: string }[];
	}>({ gallery_blurs: [] });

	// Progressive disclosure state — Mac 2026: complexity emerges on deliberate interaction
	const [showOtaImages, setShowOtaImages] = useState(false);
	const [showOtaTrust, setShowOtaTrust] = useState(false);
	const [showOtaActivity, setShowOtaActivity] = useState(false);
	const [showOtaSeo, setShowOtaSeo] = useState(false);
	const [showOtaHours, setShowOtaHours] = useState(false);
	const [showOtaProtocols, setShowOtaProtocols] = useState(false);

	// Advanced mode — Mac 2026: technical complexity layers
	const [showAdvanced, setShowAdvanced] = useState(false);

	const router = useRouter();
	const hotelId = initialData.id;

	const { register, handleSubmit, setValue, watch } = useForm({
		defaultValues: initialData,
	});

	const currentAmenities = watch("hotel_amenities") || [];
	const staffName = watch("staff_name") || "";
	const staffPin = watch("staff_pin") || "";
	const primaryColor = watch("primary_color") || "#6366f1";

	// Drag-and-drop sensors for gallery reordering
	const gallerySensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
	);

	const handleGalleryDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = galleryPreviews.findIndex((_, i) => `gallery-${i}` === active.id);
		const newIndex = galleryPreviews.findIndex((_, i) => `gallery-${i}` === over.id);
		if (oldIndex === -1 || newIndex === -1) return;
		const reordered = arrayMove(galleryPreviews, oldIndex, newIndex);
		setGalleryPreviews(reordered);
		setValue("gallery_urls", reordered);
	};

	const toggleAmenity = (id: string) => {
		const exists = currentAmenities.includes(id);
		setValue(
			"hotel_amenities",
			exists
				? currentAmenities.filter((a: string) => a !== id)
				: [...currentAmenities, id],
		);
	};

	// ─── Direct upload pipeline: compress → presign → upload → blur ──────────
	const processFiles = async (
		files: File[],
		target: "hero" | "covers" | "gallery",
	) => {
		if (files.length === 0) return;
		setIsSaving(true);
		try {
			if (target === "hero") {
				const file = files[0];
				const compressed = await compressImage(file);
				const presign = await getPresignedUploadUrlAction(
					"hero",
					file.name,
					"image/webp",
				);
				if (!presign.success || !presign.uploadUrl || !presign.publicUrl)
					throw new Error(presign.error || "Sin URL presignada");
				await uploadToR2(presign.uploadUrl, compressed);
				const blurDataURL = await generateBlurDataURL(compressed);
				setValue("main_image_url", presign.publicUrl);
				setMainImagePreview(presign.publicUrl);
				setImageBlurMeta((prev) => ({ ...prev, main_image_blur: blurDataURL }));
			} else if (target === "covers") {
				const file = files[0];
				const compressed = await compressImage(file);
				const presign = await getPresignedUploadUrlAction(
					"covers",
					file.name,
					"image/webp",
				);
				if (!presign.success || !presign.uploadUrl || !presign.publicUrl)
					throw new Error(presign.error || "Sin URL presignada");
				await uploadToR2(presign.uploadUrl, compressed);
				const blurDataURL = await generateBlurDataURL(compressed);
				setValue("cover_photo_url", presign.publicUrl);
				setCoverPhotoPreview(presign.publicUrl);
				setImageBlurMeta((prev) => ({
					...prev,
					cover_photo_blur: blurDataURL,
				}));
			} else if (target === "gallery") {
				const newUrls: string[] = [...galleryPreviews];
				const remaining = 8 - newUrls.length;
				const toProcess = files.slice(0, remaining);

				// Parallel uploads for gallery
				const results = await Promise.all(
					toProcess.map(async (file) => {
						const compressed = await compressImage(file);
						const presign = await getPresignedUploadUrlAction(
							"gallery",
							file.name,
							"image/webp",
						);
						if (!presign.success || !presign.uploadUrl || !presign.publicUrl)
							throw new Error(presign.error || "Sin URL presignada");
						await uploadToR2(presign.uploadUrl, compressed);
						const blurDataURL = await generateBlurDataURL(compressed);
						return { url: presign.publicUrl, blurDataURL };
					}),
				);

				for (const { url, blurDataURL } of results) {
					newUrls.push(url);
					setImageBlurMeta((prev) => ({
						...prev,
						gallery_blurs: [...prev.gallery_blurs, { url, blur: blurDataURL }],
					}));
				}
				setGalleryPreviews(newUrls);
				setValue("gallery_urls", newUrls);
			}
		} catch (error: any) {
			alert("Error al subir imagen: " + error.message);
		} finally {
			setIsSaving(false);
		}
	};

	const handleFileUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) return;
		await processFiles([file], "covers");
	};

	const handleMainImageUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) return;
		await processFiles([file], "hero");
	};

	const handleGalleryUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = event.target.files;
		if (!files || files.length === 0) return;
		await processFiles(Array.from(files), "gallery");
	};

	const removeGalleryImage = (index: number) => {
		const updated = galleryPreviews.filter((_, i) => i !== index);
		setGalleryPreviews(updated);
		setValue("gallery_urls", updated);
		setImageBlurMeta((prev) => ({
			...prev,
			gallery_blurs: prev.gallery_blurs.filter((_, i) => i !== index),
		}));
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};
	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};
	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};
	const handleDrop = async (
		e: React.DragEvent,
		target: "hero" | "covers" | "gallery",
	) => {
		e.preventDefault();
		e.stopPropagation();
		const files = Array.from(e.dataTransfer.files).filter((f) =>
			f.type.startsWith("image/"),
		);
		await processFiles(files, target);
	};

	const handleCreateStaff = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!staffName || !staffPin) return;
		setIsSaving(true);
		const formData = new FormData();
		formData.append("hotel_id", hotelId);
		formData.append("name", staffName);
		formData.append("role", "Recepcionista");
		formData.append("pin_code", staffPin);
		const res = await createStaffAction(formData);
		if (res.success) {
			setLocalStaff([
				...localStaff,
				{
					id: Math.random().toString(),
					name: staffName,
					role: "Recepcionista",
				},
			]);
			setValue("staff_name", "");
			setValue("staff_pin", "");
		} else alert("Error en Staff: " + res.error);
		setIsSaving(false);
	};

	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	const handleDeleteStaff = async (id: string) => {
		const staffToDelete = localStaff.find((s) => s.id === id);
		if (!staffToDelete) return;

		// Heurística #5: Prevención de errores — 2 clics deliberados
		setConfirmDeleteId(id);
	};

	const confirmDelete = async () => {
		if (!confirmDeleteId) return;
		
		const res = await deleteStaffAction(confirmDeleteId);
		if (res.success) {
			setLocalStaff(localStaff.filter((s) => s.id !== confirmDeleteId));
		} else {
			alert("Error al eliminar: " + res.error);
		}
		setConfirmDeleteId(null);
	};

	const cancelDelete = () => setConfirmDeleteId(null);

	const onMasterSave = async (data: any) => {
		setIsSaving(true);
		try {
			let res;
			if (activeTab === "general" || activeTab === "staff")
				res = await saveSettingsAction(data);
			else
				res = await updateHotelProfileAction(hotelId, {
					...data,
					image_blur_meta: imageBlurMeta,
				});
			if (!res.success) throw new Error(res.error);
			alert("✅ Cambios aplicados.");
		} catch (err: any) {
			alert("Error: " + err.message);
		} finally {
			setIsSaving(false);
		}
	};

	const handleCleanSlate = async () => {
		if (
			!confirm(
				"☢️ NUCLEAR: Se borrarán habitaciones, reservas y pagos. ¿Proceder?",
			)
		)
			return;
		setIsCleaning(true);
		const res = await executeCleanSlateAction(hotelId);
		if (res.success) {
			alert("✅ Reseteo completado.");
			router.push("/software/onboarding");
			router.refresh();
		} else {
			alert("❌ Error: " + res.error);
			setIsCleaning(false);
		}
	};

	return (
		<div className="w-full max-w-7xl mx-auto space-y-[var(--space-pause)] pb-40 font-poppins text-foreground p-8">
			<div className="glass-card p-[var(--space-breath)] rounded-[var(--radius-squircle-3xl)] border border-border shadow-2xl ring-1 ring-border">
				<div className="mb-[var(--space-breath)]">
					<h2 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
						<KeyRound className="text-indigo-400 size-8" /> Centro de Mando
					</h2>
					<p className="text-muted-foreground text-sm mt-[var(--space-focus)] font-lora italic">
						Configuración de tu propiedad.
					</p>
				</div>
				<div className="flex bg-background/60 p-1.5 rounded-[var(--radius-squircle-3xl)] border border-border gap-1.5">
					{[
						{ id: "general", label: "Operación", icon: Building },
						{ id: "ota", label: "Perfil de Canales", icon: Globe },
						{ id: "staff", label: "Equipo", icon: Users },
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id as typeof activeTab)}
							className={cn(
								"flex-1 min-w-0 px-2 py-3 md:px-6 md:py-4 rounded-[var(--radius-squircle-xl)] text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border",
								activeTab === tab.id
									? "bg-indigo-600 text-white border-indigo-400 shadow-lg"
									: "bg-transparent text-muted-foreground border-transparent hover:text-foreground",
							)}
						>
							<tab.icon size={18} className="shrink-0" />
							<span className="hidden md:inline truncate">{tab.label}</span>
						</button>
					))}
					{/* Advanced mode toggle — Mac 2026: complexity layers */}
					<button
						type="button"
						onClick={() => setShowAdvanced(!showAdvanced)}
						className={cn(
							"px-2 md:px-4 py-3 md:py-4 rounded-[var(--radius-squircle-xl)] text-xs font-bold uppercase tracking-widest transition-all border flex items-center justify-center gap-2 shrink-0",
							showAdvanced
								? "bg-amber-500/10 text-amber-400 border-amber-500/20"
								: "bg-transparent text-muted-foreground border-transparent hover:text-muted-foreground",
						)}
					>
						<Settings2 size={18} className="shrink-0" />
					</button>
				</div>
			</div>

			<form
				id="master-settings-form"
				onSubmit={handleSubmit(onMasterSave)}
				className="space-y-12"
			>
				<AnimatePresence mode="wait">
					{activeTab === "general" && (
						<motion.div
							key="gen"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="grid grid-cols-1 md:grid-cols-2 gap-8"
						>
							<div className="bg-muted p-10 rounded-[var(--radius-squircle-3xl)] border border-border shadow-xl space-y-8">
								<h3 className="text-xl font-bold flex items-center gap-3">
									<Building className="text-indigo-400" /> Negocio
								</h3>
								<div className="space-y-6">
									<input
										{...register("name")}
										placeholder="Nombre"
										className="w-full p-5 bg-background border border-border rounded-[var(--radius-squircle-2xl)]"
									/>

									{/* Código de Acceso — Solo lectura (Heurística #6: Reconocimiento) */}
									<div>
										<label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
											Código de Acceso
										</label>
										<div className="flex items-center gap-2">
											<input
												readOnly
												value={initialData?.slug || ""}
												aria-label="Código de acceso del hotel para staff login"
												className="flex-1 p-5 bg-background/50 border border-border rounded-[var(--radius-squircle-2xl)] text-muted-foreground font-mono text-sm cursor-not-allowed"
											/>
											<button
												type="button"
												onClick={() => {
													navigator.clipboard.writeText(initialData?.slug || "");
													setCopiedSlug(true);
													setTimeout(() => setCopiedSlug(false), 2000);
												}}
												className="p-5 bg-muted border border-border rounded-[var(--radius-squircle-2xl)] hover:bg-accent transition-colors"
												aria-label="Copiar código de acceso"
											>
												{copiedSlug ? (
													<Check size={18} className="text-emerald-400" />
												) : (
													<Copy size={18} className="text-muted-foreground" />
												)}
											</button>
										</div>
										<p className="text-[10px] text-muted-foreground/60 mt-1.5">
											Dale este código a tus recepcionistas para que ingresen en{" "}
											<code className="text-foreground/70 bg-muted/50 px-1 rounded">/staff-login</code>
										</p>
									</div>

									<div className="grid grid-cols-2 gap-6">
										<input
											{...register("city")}
											placeholder="Ciudad / Municipio"
											className="p-5 bg-background border border-border rounded-[var(--radius-squircle-2xl)]"
										/>
										<input
											{...register("location")}
											placeholder="Zona / Vereda / Barrio"
											className="p-5 bg-background border border-border rounded-[var(--radius-squircle-2xl)]"
										/>
									</div>
									<input
										{...register("address")}
										placeholder="Dirección completa"
										className="w-full p-5 bg-background border border-border rounded-[var(--radius-squircle-2xl)]"
									/>

									{/* Map Picker — drag pin to exact hotel location */}
									<div>
										<label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
											Ubicación exacta en el mapa
										</label>
										<p className="text-xs text-muted-foreground mb-2">
											Arrastrá el pin al punto exacto de tu hotel. Hacé clic en
											el mapa para moverlo.
										</p>
										<MapPicker
											initialLat={initialData?.latitude ?? null}
											initialLng={initialData?.longitude ?? null}
											cityName={watch("city") || initialData?.city}
											onPositionChange={(lat, lng) => {
												setValue("latitude", lat);
												setValue("longitude", lng);
											}}
										/>
									</div>
									<input type="hidden" {...register("latitude")} />
									<input type="hidden" {...register("longitude")} />
									<div className="grid grid-cols-2 gap-6">
										<input
											{...register("phone")}
											placeholder="Tel"
											className="p-5 bg-background border border-border rounded-[var(--radius-squircle-2xl)]"
										/>
										<input
											{...register("email")}
											placeholder="Email"
											className="p-5 bg-background border border-border rounded-[var(--radius-squircle-2xl)]"
										/>
									</div>

									{/* Fiscal — collapsible (Ley de Miller) */}
									<div className="mt-6 p-4 bg-card/40 border border-border/20 rounded-[var(--radius-squircle-xl)]">
										<button
											type="button"
											onClick={() => setShowFiscal(!showFiscal)}
											className="w-full flex items-center justify-between"
										>
											<span className="text-sm font-bold">
												💰 Régimen Tributario
											</span>
											<span className="text-xs text-muted-foreground">
												{showFiscal ? "▲" : "▼"}
											</span>
										</button>
										{showFiscal && (
											<div className="mt-4">
												<label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
													Régimen Tributario
												</label>
												<select
													{...register("tax_rate", { valueAsNumber: true })}
													className="w-full p-5 bg-background border border-border rounded-[var(--radius-squircle-2xl)] text-foreground"
												>
													<option value={0}>
														Régimen Simplificado (sin IVA)
													</option>
													<option value={0.19}>
														Régimen Ordinario (IVA 19%)
													</option>
												</select>
											</div>
										)}
									</div>
								</div>
							</div>
							{/* Pagos — collapsible (Ley de Miller) */}
							<div className="mt-6 p-4 bg-card/40 border border-border/20 rounded-[var(--radius-squircle-xl)]">
								<button
									type="button"
									onClick={() => setShowPayments(!showPayments)}
									className="w-full flex items-center justify-between"
								>
									<span className="text-sm font-bold">
										💳 Configuración de Pagos
									</span>
									<span className="text-xs text-muted-foreground">
										{showPayments ? "▲" : "▼"}
									</span>
								</button>
								{showPayments && (
									<div className="mt-4 space-y-6">
										<input
											{...register("wompi_public_key")}
											type="password"
											placeholder="Public Key"
											className="w-full p-5 bg-background border border-border rounded-[var(--radius-squircle-2xl)]"
										/>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div>
												<input
													{...register("wompi_integrity_secret")}
													type="password"
													placeholder="Integrity Secret (Checkout)"
													className="w-full p-5 bg-background border border-border rounded-[var(--radius-squircle-2xl)]"
												/>
												<p className="text-[10px] text-muted-foreground mt-1">
													Para firma de checkout
												</p>
											</div>
											<div>
												<input
													{...register("wompi_events_secret")}
													type="password"
													placeholder="Events Secret (Webhook)"
													className="w-full p-5 bg-background border border-border rounded-[var(--radius-squircle-2xl)]"
												/>
												<p className="text-[10px] text-muted-foreground mt-1">
													Para verificar webhooks
												</p>
											</div>
										</div>
										<p className="text-[11px] text-warning/80 bg-warning/5 border border-warning/20 rounded-[var(--radius-squircle-md)] p-3">
											⚠️ Ambos secretos son obligatorios. Se obtienen en Wompi →
											Desarrollo → API Keys (son valores distintos).
										</p>
									</div>
								)}
							</div>

							{/* Conectores de Pago — Soberanía Financiera (Ley de Hick) */}
							<div className="mt-6">
								<PaymentConnectors
									hotelId={hotelId}
									currentGateway={initialData?.wompi_public_key ? 'wompi' : undefined}
								/>
							</div>
						</motion.div>
					)}

					{activeTab === "ota" && (
						<motion.div
							key="ota"
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--space-breath)]"
						>
							{/* LEFT: Tier 1 — Core Channel profile (always visible, high visual weight) */}
							<div className="lg:col-span-2 space-y-[var(--space-breath)]">
								{/* TIER 1: ESENCIAL — Identidad del hotel */}
								<div className="glass-card p-[var(--space-breath)]">
									<h3 className="text-xl font-bold flex items-center gap-3 mb-[var(--space-focus)]">
										<MessageCircle className="text-indigo-400" /> Identidad del
										Hotel
									</h3>
									<div className="space-y-[var(--space-focus)]">
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
												Titulo seccion "La Historia"
											</label>
											<input
												{...register("story_section_title")}
												className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] text-sm"
												placeholder="La Historia"
											/>
										</div>
										<textarea
											{...register("description")}
											rows={5}
											className="w-full p-6 bg-muted border border-border rounded-[var(--radius-squircle-3xl)]"
											placeholder="Descripcion del hotel..."
										/>
										<div className="grid grid-cols-2 gap-[var(--space-focus)]">
											<input
												{...register("whatsapp_number")}
												placeholder="WhatsApp"
												className="p-5 bg-background border border-border rounded-[var(--radius-squircle-2xl)]"
											/>
											<input
												{...register("google_maps_url")}
												placeholder="Google Maps"
												className="p-5 bg-background border border-border rounded-[var(--radius-squircle-2xl)] text-xs"
											/>
										</div>
									</div>
								</div>

								{/* TIER 1: AMENIDADES — Siempre visible */}
								<div className="glass-card p-[var(--space-breath)]">
									<h3 className="text-xl font-bold flex items-center gap-3 mb-[var(--space-focus)]">
										<UtensilsCrossed className="text-indigo-400" /> Amenidades
									</h3>
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--space-focus)]">
										{HOTEL_AMENITIES.map((am) => (
											<button
												type="button"
												key={am.id}
												onClick={() => toggleAmenity(am.id)}
												className={cn(
													"p-6 rounded-[var(--radius-squircle-3xl)] border text-[10px] font-bold uppercase flex flex-col items-center gap-4 transition-all",
													currentAmenities.includes(am.id)
														? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
														: "border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
												)}
											>
												<am.icon size={24} /> {am.label}
											</button>
										))}
									</div>
								</div>

								{/* TIER 2: OPERATIVO — Multimedia (collapsed by default) */}
								<DisclosureSection
									title="Multimedia"
									icon={ImageIcon}
									iconColor="text-indigo-400"
									description="Fotos hero, cover y galeria"
									isOpen={showOtaImages}
									onToggle={() => setShowOtaImages(!showOtaImages)}
								>
									<div className="space-y-[var(--space-focus)]">
										{/* HERO IMAGE */}
										<div>
											<h4 className="text-sm font-bold mb-3 flex items-center gap-2">
												<UploadCloud className="text-indigo-400" size={16} />{" "}
												Foto Hero
											</h4>
											<p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-widest">
												Imagen principal del hotel en la pagina publica
											</p>
											<div
												className="relative w-full h-48 bg-background rounded-[var(--radius-squircle-3xl)] border-2 border-dashed border-border overflow-hidden group"
												onDragOver={handleDragOver}
												onDragEnter={handleDragEnter}
												onDragLeave={handleDragLeave}
												onDrop={(e) => handleDrop(e, "hero")}
											>
												{mainImagePreview ? (
													<img
														src={mainImagePreview}
														alt="Hero"
														className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
													/>
												) : (
													<div className="flex flex-col h-full items-center justify-center opacity-20">
														<UploadCloud size={40} />
														<span className="text-[9px] mt-2 font-bold uppercase">
															Click o arrastrá acá
														</span>
													</div>
												)}
												<input
													type="file"
													accept="image/*"
													onChange={handleMainImageUpload}
													className="absolute inset-0 opacity-0 cursor-pointer"
												/>
											</div>
										</div>

										{/* COVER PHOTO */}
										<div>
											<h4 className="text-sm font-bold mb-3 flex items-center gap-2">
												<UploadCloud className="text-sky-400" size={16} /> Foto
												Secundaria
											</h4>
											<div
												className="relative w-full h-40 bg-background rounded-[var(--radius-squircle-3xl)] border-2 border-dashed border-border overflow-hidden group"
												onDragOver={handleDragOver}
												onDragEnter={handleDragEnter}
												onDragLeave={handleDragLeave}
												onDrop={(e) => handleDrop(e, "covers")}
											>
												{coverPhotoPreview ? (
													<img
														src={coverPhotoPreview}
														alt="C"
														className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
													/>
												) : (
													<div className="flex h-full items-center justify-center opacity-20">
														<UploadCloud size={40} />
													</div>
												)}
												<input
													type="file"
													accept="image/*"
													onChange={handleFileUpload}
													className="absolute inset-0 opacity-0 cursor-pointer"
												/>
											</div>
										</div>

										{/* GALLERY */}
										<div>
											<h4 className="text-sm font-bold mb-3 flex items-center gap-2">
												<UploadCloud className="text-emerald-400" size={16} />{" "}
												Galeria del Hotel
											</h4>
											<p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-widest">
												{galleryPreviews.length}/8 fotos
											</p>
											{galleryPreviews.length > 0 && (
												<DndContext
													sensors={gallerySensors}
													collisionDetection={closestCenter}
													onDragEnd={handleGalleryDragEnd}
												>
													<SortableContext
														items={galleryPreviews.map((_, i) => `gallery-${i}`)}
														strategy={rectSortingStrategy}
													>
														<div className="grid grid-cols-2 gap-2 mb-4">
															{galleryPreviews.map((url, i) => (
																<SortableGalleryThumb
																	key={`gallery-${i}`}
																	id={`gallery-${i}`}
																	url={url}
																	index={i}
																	onRemove={removeGalleryImage}
																/>
															))}
														</div>
													</SortableContext>
												</DndContext>
											)}
											{galleryPreviews.length < 8 && (
												<label
													className="flex flex-col items-center justify-center w-full h-20 bg-background border-2 border-dashed border-border rounded-[var(--radius-squircle-2xl)] cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
													onDragOver={handleDragOver}
													onDragEnter={handleDragEnter}
													onDragLeave={handleDragLeave}
													onDrop={(e) => handleDrop(e, "gallery")}
												>
													<Plus
														className="text-muted-foreground group-hover:text-emerald-400 mb-1"
														size={18}
													/>
													<span className="text-[9px] text-muted-foreground font-bold uppercase">
														Agregar fotos
													</span>
													<input
														type="file"
														accept="image/*"
														multiple
														onChange={handleGalleryUpload}
														className="hidden"
													/>
												</label>
											)}
										</div>
									</div>
								</DisclosureSection>

								{/* TIER 2: OPERATIVO — Sellos de Confianza */}
								<DisclosureSection
									title="Sellos de Confianza"
									icon={ShieldCheck}
									iconColor="text-emerald-400"
									description={
										<span className="inline-flex items-center gap-1">
											Reserva Directa y Confirmacion Inmediata
											<GlassTooltip
												content="Estos sellos aparecen en la seccion 'La Historia' de tu pagina publica para generar confianza en el huesped."
												side="top"
											>
												<span className="cursor-help text-muted-foreground hover:text-muted-foreground transition-colors">
													<Eye size={12} />
												</span>
											</GlassTooltip>
										</span>
									}
									isOpen={showOtaTrust}
									onToggle={() => setShowOtaTrust(!showOtaTrust)}
								>
									<div className="space-y-[var(--space-focus)]">
										<div className="flex items-center justify-between">
											<p className="text-xs text-muted-foreground">
												Mostrar sellos en la pagina publica
											</p>
											<button
												type="button"
												onClick={() =>
													setValue(
														"show_trust_badges",
														!watch("show_trust_badges"),
													)
												}
												className={cn(
													"relative w-12 h-7 rounded-full transition-all",
													watch("show_trust_badges")
														? "bg-emerald-500"
														: "bg-muted",
												)}
											>
												<div
													className={cn(
														"absolute top-0.5 size-6 rounded-full bg-white shadow transition-all",
														watch("show_trust_badges") ? "left-5" : "left-0.5",
													)}
												/>
											</button>
										</div>

										{watch("show_trust_badges") && (
											<div className="space-y-[var(--space-focus)] pt-2">
												<div className="grid grid-cols-2 gap-3">
													<div>
														<label className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1 block">
															Badge 1 — Titulo
														</label>
														<input
															{...register("trust_badge_1_title")}
															className="w-full p-3 bg-background border border-border rounded-[var(--radius-squircle-lg)] text-xs"
															placeholder="Reserva Directa"
														/>
													</div>
													<div>
														<label className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1 block">
															Badge 1 — Subtitulo
														</label>
														<input
															{...register("trust_badge_1_subtitle")}
															className="w-full p-3 bg-background border border-border rounded-[var(--radius-squircle-lg)] text-xs"
															placeholder="Sin plataformas externas"
														/>
													</div>
												</div>
												<div className="grid grid-cols-2 gap-3">
													<div>
														<label className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1 block">
															Badge 2 — Titulo
														</label>
														<input
															{...register("trust_badge_2_title")}
															className="w-full p-3 bg-background border border-border rounded-[var(--radius-squircle-lg)] text-xs"
															placeholder="Confirmacion Inmediata"
														/>
													</div>
													<div>
														<label className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1 block">
															Badge 2 — Subtitulo
														</label>
														<input
															{...register("trust_badge_2_subtitle")}
															className="w-full p-3 bg-background border border-border rounded-[var(--radius-squircle-lg)] text-xs"
															placeholder="Bloqueo al instante"
														/>
													</div>
												</div>
											</div>
										)}
									</div>
								</DisclosureSection>

								{/* TIER 2: OPERATIVO — Actividad Reciente */}
								<DisclosureSection
									title="Actividad Reciente"
									icon={TrendingUp}
									iconColor="text-amber-400"
									description="Indicadores de urgencia social"
									isOpen={showOtaActivity}
									onToggle={() => setShowOtaActivity(!showOtaActivity)}
								>
									<div className="space-y-[var(--space-focus)]">
										<div className="flex items-center justify-between">
											<p className="text-xs text-muted-foreground">
												Mostrar actividad reciente
											</p>
											<button
												type="button"
												onClick={() =>
													setValue(
														"show_recent_activity",
														!watch("show_recent_activity"),
													)
												}
												className={cn(
													"relative w-12 h-7 rounded-full transition-all",
													watch("show_recent_activity")
														? "bg-emerald-500"
														: "bg-muted",
												)}
											>
												<div
													className={cn(
														"absolute top-0.5 size-6 rounded-full bg-white shadow transition-all",
														watch("show_recent_activity")
															? "left-5"
															: "left-0.5",
													)}
												/>
											</button>
										</div>

										{watch("show_recent_activity") && (
											<div className="space-y-3">
												{(
													watch("recent_activity_messages") || [
														{
															icon: "TrendingUp",
															text: "3 reservas en las ultimas 24 horas",
															color: "text-emerald-600",
														},
														{
															icon: "Clock",
															text: "2 personas estan viendo esta propiedad ahora",
															color: "text-amber-600",
														},
													]
												).map((msg: any, i: number) => (
													<div
														key={i}
														className="flex items-center gap-3 p-3 bg-muted rounded-[var(--radius-squircle-2xl)] border border-border"
													>
														<div className="size-8 rounded-[var(--radius-squircle-md)] bg-muted flex items-center justify-center shrink-0">
															{msg.icon === "TrendingUp" ? (
																<TrendingUp
																	size={14}
																	className="text-emerald-400"
																/>
															) : (
																<Clock size={14} className="text-amber-400" />
															)}
														</div>
														<input
															value={msg.text}
															onChange={(e) => {
																const msgs = [
																	...(watch("recent_activity_messages") || []),
																];
																msgs[i] = { ...msg, text: e.target.value };
																setValue("recent_activity_messages", msgs);
															}}
															className="flex-1 bg-transparent text-xs text-foreground outline-none"
															placeholder="Mensaje de actividad..."
														/>
														<button
															type="button"
															onClick={() => {
																const msgs = (
																	watch("recent_activity_messages") || []
																).filter((_: any, idx: number) => idx !== i);
																setValue("recent_activity_messages", msgs);
															}}
															className="p-1 text-muted-foreground hover:text-rose-400 transition-colors"
														>
															<Trash2 size={14} />
														</button>
													</div>
												))}
												<button
													type="button"
													onClick={() => {
														const msgs = [
															...(watch("recent_activity_messages") || []),
															{
																icon: "TrendingUp",
																text: "",
																color: "text-emerald-600",
															},
														];
														setValue("recent_activity_messages", msgs);
													}}
													className="flex items-center gap-2 text-xs text-muted-foreground hover:text-emerald-400 transition-colors"
												>
													<Plus size={14} /> Agregar mensaje
												</button>
											</div>
										)}
									</div>
								</DisclosureSection>

								{/* TIER 2: OPERATIVO — Horarios */}
								<DisclosureSection
									title="Horarios Operativos"
									icon={Clock}
									iconColor="text-cyan-400"
									description="Check-in, Check-out y Recepcion"
									isOpen={showOtaHours}
									onToggle={() => setShowOtaHours(!showOtaHours)}
								>
									<div className="grid grid-cols-3 gap-[var(--space-focus)]">
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
												Check-in
											</label>
											<input
												{...register("check_in_time")}
												type="time"
												className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] text-sm text-center font-mono"
											/>
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
												Check-out
											</label>
											<input
												{...register("check_out_time")}
												type="time"
												className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] text-sm text-center font-mono"
											/>
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
												Recepcion
											</label>
											<input
												{...register("reception_hours")}
												placeholder="24/7"
												className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] text-sm text-center"
											/>
										</div>
									</div>
								</DisclosureSection>

								{/* TIER 2: OPERATIVO — Protocolos */}
								<DisclosureSection
									title="Protocolos"
									icon={ShieldAlert}
									iconColor="text-amber-500/70"
									description="Politicas de cancelacion y reglas"
									isOpen={showOtaProtocols}
									onToggle={() => setShowOtaProtocols(!showOtaProtocols)}
								>
									<div className="bg-muted p-6 rounded-[var(--radius-squircle-2xl)] border border-amber-500/20">
										<textarea
											{...register("cancellation_policy")}
											rows={6}
											className="w-full bg-transparent outline-none resize-none text-muted-foreground text-xs italic"
											placeholder="Reglas de cancelacion..."
										/>
									</div>
								</DisclosureSection>
							</div>

							{/* RIGHT: Tier 1 + Tier 3 */}
							<div className="space-y-[var(--space-breath)]">
								{/* TIER 1: ESENCIAL — Category Badge (always visible) */}
								<div className="glass-card p-[var(--space-breath)]">
									<h3 className="text-xl font-bold flex items-center gap-3 mb-[var(--space-focus)]">
										<Star className="text-amber-400" /> Insignia de Categoria
									</h3>
									<p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-[var(--space-focus)]">
										Texto que aparece junto al nombre del hotel en la pagina
										publica. Dejar vacio para ocultar.
									</p>
									<input
										{...register("category_badge")}
										placeholder="Ej: Categoria Premium, Boutique Hotel, Eco-Lodge..."
										className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] text-sm"
									/>
									{watch("category_badge") && (
										<div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-[var(--radius-squircle-2xl)] mt-[var(--space-focus)]">
											<Star
												size={12}
												className="text-amber-400 fill-amber-400"
											/>
											<span className="text-xs font-bold text-amber-300">
												{watch("category_badge")}
											</span>
										</div>
									)}
								</div>

								{/* TIER 3: AVANZADO — SEO (requires showAdvanced) */}
								{showAdvanced && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: "auto" }}
										exit={{ opacity: 0, height: 0 }}
										className="glass-card p-[var(--space-breath)] border-amber-500/10 bg-amber-500/5"
									>
										<div className="flex items-center gap-2 mb-[var(--space-focus)]">
											<Globe className="text-amber-400 size-5" />
											<h3 className="text-lg font-bold text-amber-300">
												SEO y Redes Sociales
											</h3>
										</div>
										<p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-[var(--space-focus)]">
											Meta tags y Open Graph
											<GlassTooltip
												content="Controla como aparece tu hotel en Google, WhatsApp y Facebook. El OG Image es la foto que se muestra al compartir el link."
												side="top"
											>
												<span className="cursor-help text-muted-foreground hover:text-muted-foreground transition-colors ml-1">
													<Eye size={12} />
												</span>
											</GlassTooltip>
										</p>
										<div className="space-y-[var(--space-focus)]">
											<div>
												<label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
													Meta Title
												</label>
												<input
													{...register("seo_meta_title")}
													placeholder="Ej: Hotel Los Andes | Reserva Oficial en Mendoza"
													className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] text-sm"
												/>
												<p className="text-[9px] text-muted-foreground mt-1">
													{(watch("seo_meta_title") || "").length}/60 caracteres
													recomendados
												</p>
											</div>

											<div>
												<label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
													Meta Description
												</label>
												<textarea
													{...register("seo_meta_description")}
													rows={3}
													placeholder="Ej: Disfruta de la mejor experiencia en Mendoza. Piscina, desayuno incluido y vistas panoramicas."
													className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] text-sm resize-none"
												/>
												<p className="text-[9px] text-muted-foreground mt-1">
													{(watch("seo_meta_description") || "").length}/160
													caracteres recomendados
												</p>
											</div>

											<div>
												<label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
													OG Image URL
												</label>
												<input
													{...register("seo_og_image_url")}
													placeholder="https://..."
													className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] text-xs"
												/>
												<p className="text-[9px] text-muted-foreground mt-1">
													Imagen que aparece al compartir en WhatsApp, Facebook,
													etc.
												</p>
											</div>

											<div>
												<label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
													Canonical URL
												</label>
												<input
													{...register("seo_canonical_url")}
													placeholder="https://tuhotel.com/hotel/slug"
													className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-2xl)] text-xs"
												/>
											</div>
										</div>
									</motion.div>
								)}
							</div>
						</motion.div>
					)}

					{activeTab === "staff" && (
						<motion.div
							key="stf"
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: 20 }}
							className="grid grid-cols-1 lg:grid-cols-2 gap-8"
						>
							<div className="bg-muted p-10 rounded-[var(--radius-squircle-3xl)] border border-border space-y-8">
								<h3 className="text-xl font-bold flex items-center gap-3">
									<Palette className="text-indigo-400" /> Marca
								</h3>
								<div className="bg-background p-8 rounded-[var(--radius-squircle-3xl)] flex gap-6 items-center">
									<div
										className="size-20 rounded-[var(--radius-squircle-xl)] shadow-2xl"
										style={{ backgroundColor: primaryColor }}
									/>
									<input
										{...register("primary_color")}
										className="flex-1 p-4 bg-card border border-border rounded-[var(--radius-squircle-lg)] text-xl font-bold text-indigo-400 text-center"
									/>
								</div>
							</div>
							<div className="bg-muted p-10 rounded-[var(--radius-squircle-3xl)] border border-border flex flex-col">
								<h3 className="text-xl font-bold flex items-center gap-3 mb-8">
									<Users className="text-sky-400" /> Equipo
								</h3>
								<div className="bg-background p-6 rounded-[var(--radius-squircle-3xl)] border border-border grid grid-cols-12 gap-4 items-end mb-8">
									<div className="col-span-7">
										<input
											{...register("staff_name")}
											className="w-full p-4 bg-card border border-border rounded-[var(--radius-squircle-lg)]"
											placeholder="Nombre"
										/>
									</div>
									<div className="col-span-3">
										<input
											{...register("staff_pin")}
											maxLength={4}
											className="w-full p-4 bg-card border border-border rounded-[var(--radius-squircle-lg)] font-mono text-center"
											placeholder="PIN"
										/>
									</div>
									<div className="col-span-2">
										<button
											type="button"
											onClick={handleCreateStaff}
											className="w-full bg-indigo-600 h-[56px] rounded-[var(--radius-squircle-lg)] flex items-center justify-center"
										>
											<Check size={24} />
										</button>
									</div>
								</div>
								<div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
									{localStaff.map((p) => (
										<div
											key={p.id}
											className="flex justify-between items-center p-5 bg-muted border border-border rounded-[var(--radius-squircle-xl)] hover:bg-accent transition-all"
										>
											<div className="flex items-center gap-4">
												<div className="size-10 rounded-[var(--radius-squircle-lg)] bg-muted flex items-center justify-center text-xs font-bold">
													{p.name.charAt(0)}
												</div>
												<div>
													<p className="font-bold">{p.name}</p>
													<p className="text-[10px] opacity-50 uppercase tracking-tighter">
														{p.role}
													</p>
												</div>
											</div>
											
											{confirmDeleteId === p.id ? (
												<div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
													<span className="text-xs text-rose-400 font-bold">¿Eliminar?</span>
													<button
														type="button"
														onClick={confirmDelete}
														className="px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-[var(--radius-squircle-md)] hover:bg-rose-600 transition-colors"
													>
														Sí
													</button>
													<button
														type="button"
														onClick={cancelDelete}
														className="px-3 py-1.5 bg-muted text-muted-foreground text-xs font-bold rounded-[var(--radius-squircle-md)] hover:text-foreground transition-colors"
													>
														No
													</button>
												</div>
											) : (
												<button
													type="button"
													onClick={() => handleDeleteStaff(p.id)}
													className="p-3 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-[var(--radius-squircle-lg)]"
												>
													<Trash2 size={20} />
												</button>
											)}
										</div>
									))}
								</div>
							</div>
						</motion.div>
					)}

					{/* ADVANCED TAB — Mac 2026: Technical complexity layer */}
					{showAdvanced && (
						<motion.div
							key="advanced"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 20 }}
							className="space-y-8"
						>
							<div className="glass-panel p-10 rounded-[var(--radius-squircle-3xl)] border border-amber-500/10">
								<div className="flex items-center gap-3 mb-8">
									<Settings2 className="text-amber-400 size-6" />
									<div>
										<h3 className="text-xl font-bold text-foreground">
											Configuración Avanzada
										</h3>
										<p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
											API, Webhooks y Seguro Anti-Sobreventa
										</p>
									</div>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
									{/* API Keys */}
									<div className="space-y-4">
										<h4 className="text-sm font-bold text-foreground flex items-center gap-2">
											<KeyRound size={16} className="text-indigo-400" /> API
											Keys
										</h4>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
												Public Key
											</label>
											<input
												readOnly
												value="pk_live_••••••••••••"
												className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-lg)] text-muted-foreground font-mono text-sm"
											/>
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
												Secret Key
											</label>
											<input
												readOnly
												value="sk_live_••••••••••••"
												className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-lg)] text-muted-foreground font-mono text-sm"
											/>
										</div>
									</div>

									{/* Webhooks */}
									<div className="space-y-4">
										<h4 className="text-sm font-bold text-foreground flex items-center gap-2">
											<Globe size={16} className="text-emerald-400" /> Webhook
											Endpoint
										</h4>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
												URL
											</label>
											<input
												placeholder="https://tu-servidor.com/webhooks/hospedasuite"
												className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-lg)] text-foreground font-mono text-sm"
											/>
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 block">
												Signing Secret
											</label>
											<input
												readOnly
												value="whsec_••••••••••••"
												className="w-full p-4 bg-background border border-border rounded-[var(--radius-squircle-lg)] text-muted-foreground font-mono text-sm"
											/>
										</div>
									</div>
								</div>

								{/* Seguro Anti-Sobreventa */}
								<div className="mt-8 pt-8 border-t border-border">
									<h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
										<RefreshCcw size={16} className="text-sky-400" /> Channel
										Manager
									</h4>
									<div className="p-6 bg-muted rounded-[var(--radius-squircle-2xl)] border border-border">
										<p className="text-xs text-muted-foreground mb-4">
											Conecta con canales externos para sincronización automática
											de inventario.
										</p>
										<div className="flex items-center gap-4">
											<span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-[var(--radius-squircle-md)]">
												Booking.com
											</span>
											<span className="text-xs font-bold text-muted-foreground bg-card px-3 py-1.5 rounded-[var(--radius-squircle-md)] border border-border">
												Airbnb
											</span>
											<span className="text-xs font-bold text-muted-foreground bg-card px-3 py-1.5 rounded-[var(--radius-squircle-md)] border border-border">
												Expedia
											</span>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</form>

			{/* TIER 3: ZONA DE PELIGRO — Solo visible en modo avanzado */}
			{showAdvanced && (
				<motion.section
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="mt-[var(--space-silence)] pt-[var(--space-pause)] border-t border-red-500/20"
				>
					<div className="flex items-center gap-4 mb-[var(--space-breath)]">
						<div className="p-3 bg-red-500/10 rounded-[var(--radius-squircle-xl)] text-red-500">
							<AlertOctagon size={28} />
						</div>
						<div>
							<h3 className="text-red-500 font-bold text-2xl leading-none">
								Zona de Peligro
							</h3>
							<p className="text-white/20 text-xs mt-1 uppercase tracking-widest font-bold">
								Factory Reset
							</p>
						</div>
					</div>
					<div className="glass-card p-[var(--space-pause)] border-red-500/10 bg-red-500/5 flex flex-col lg:flex-row items-center justify-between gap-[var(--space-breath)] transition-all hover:bg-red-500/[0.08]">
						<div className="max-w-2xl text-center lg:text-left">
							<h4 className="text-white font-bold text-2xl mb-3">
								Ejecutar Clean Slate
							</h4>
							<p className="text-white/50 text-sm leading-relaxed italic">
								Borra irrevocablemente el historial financiero y las
								habitaciones para transicionar de demostración a operación real.
							</p>
						</div>
						<button
							type="button"
							onClick={handleCleanSlate}
							disabled={isCleaning}
							className="w-full lg:w-auto min-w-[300px] px-12 py-6 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-[var(--radius-squircle-3xl)] font-bold transition-all duration-500 border border-red-500/30 flex items-center justify-center gap-4 shadow-cta disabled:opacity-30"
						>
							{isCleaning ? (
								<RefreshCcw className="animate-spin" size={24} />
							) : (
								<Trash2 size={24} />
							)}
							<span className="uppercase tracking-tighter text-xl">
								{isCleaning ? "Purgando..." : "Resetear y Wizard"}
							</span>
						</button>
					</div>
				</motion.section>
			)}

			<div className="fixed bottom-28 left-0 right-0 px-8 z-[var(--z-overlay)] pointer-events-none">
				<div className="max-w-7xl mx-auto flex justify-center lg:justify-end">
					<button
						form="master-settings-form"
						type="submit"
						disabled={isSaving || isCleaning}
						className="pointer-events-auto bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-6 rounded-[var(--radius-squircle-3xl)] font-bold shadow-cta hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-50 ring-1 ring-border"
					>
						{isSaving ? (
							<RefreshCcw className="animate-spin" size={24} />
						) : (
							<Save size={24} />
						)}
						<span className="text-lg uppercase tracking-tight">
							Sincronizar Bóveda
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}
