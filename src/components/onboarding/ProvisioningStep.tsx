"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
	Building2,
	CheckCircle2,
	AlertCircle,
	ExternalLink,
	LayoutDashboard,
	Globe,
	Copy,
	Check,
	Clock,
	UploadCloud,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { executeOnboardingProvisioning } from "@/app/actions/onboarding";
import { getPresignedOnboardingUrlAction } from "@/app/actions/onboarding-upload";
import { compressImage, uploadToR2 } from "@/lib/upload-utils";
import { fullWizardStateSchema } from "@/lib/onboarding-schemas";
import { detectUploadFailures } from "@/lib/upload-validator";

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

type ProvisioningStatus = "uploading" | "provisioning" | "success" | "error" | "duplicate_review";

export default function ProvisioningStep() {
	const t = useTranslations("onboarding.provisioning");
	const router = useRouter();
	const {
		hotelIdentity,
		galleryFiles,
		rooms,
		settings,
		paymentTransactionId,
		paymentMethod,
		manualReceiptUrl,
		manualPaymentMethod,
		reset,
	} = useOnboardingStore();
	const [status, setStatus] = useState<ProvisioningStatus>("provisioning");
	const [uploadProgress, setUploadProgress] = useState({
		current: 0,
		total: 0,
	});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [errorDetails, setErrorDetails] = useState<
		{ msg: string; step: number }[]
	>([]);
	const [hotelSlug, setHotelSlug] = useState<string | null>(null);
	const [copiedField, setCopiedField] = useState<string | null>(null);

	const copyToClipboard = (text: string, field: string) => {
		navigator.clipboard.writeText(text);
		setCopiedField(field);
		setTimeout(() => setCopiedField(null), 2000);
	};

	useEffect(() => {
		async function provision() {
			const isManual = paymentMethod === "manual";
			const hasPayment = paymentMethod === "free" || (isManual ? !!manualReceiptUrl : !!paymentTransactionId);

			if (!hasPayment) {
				setStatus("error");
				setErrorMessage(t("noTransaction"));
				return;
			}

			// ─── FASE 0: SUBIR IMÁGENES (PARALELO CON PRESIGNED URLs) ─
			// Reemplaza blob:// URLs por URLs públicas de R2
			setStatus("uploading");

			const allFiles: { type: "gallery" | "room"; id: string; file: File }[] =
				[];

			// Recolectar archivos de galería
			galleryFiles.forEach((file, i) => {
				allFiles.push({ type: "gallery", id: `gallery-${i}`, file });
			});

			// Recolectar archivos de habitaciones
			rooms.forEach((room) => {
				room.imageFiles.forEach((file) => {
					allFiles.push({ type: "room", id: room.id, file });
				});
			});

			const roomUrlMap: Record<string, string[]> = {};
			const galleryUrls: string[] = [];

			setUploadProgress({ current: 0, total: allFiles.length });

			// Upload paralelo con tracking de progreso
			const uploadSingle = async (item: (typeof allFiles)[0]) => {
				const compressed = await compressImage(item.file);
				const presign = await getPresignedOnboardingUrlAction(
					item.file.name,
					"image/webp",
				);
				if (!presign.success || !presign.uploadUrl || !presign.publicUrl) {
					throw new Error(presign.error || "Sin URL presignada");
				}
				await uploadToR2(presign.uploadUrl, compressed);
				return { type: item.type, id: item.id, url: presign.publicUrl };
			};

			// Procesar en batches de 3 para no saturar la red
			const batchSize = 3;
			let completed = 0;

			for (let i = 0; i < allFiles.length; i += batchSize) {
				const batch = allFiles.slice(i, i + batchSize);
				const results = await Promise.allSettled(batch.map(uploadSingle));

				for (const result of results) {
					if (result.status === "fulfilled") {
						if (result.value.type === "gallery") {
							galleryUrls.push(result.value.url);
						} else {
							if (!roomUrlMap[result.value.id])
								roomUrlMap[result.value.id] = [];
							roomUrlMap[result.value.id].push(result.value.url);
						}
					}
					completed++;
					setUploadProgress({ current: completed, total: allFiles.length });
				}
			}

			// ─── FASE 1: VERIFICAR QUE TODAS LAS IMÁGENES SE SUBIERON ──
			const uploadError = detectUploadFailures({
				galleryFileCount: galleryFiles.length,
				galleryUrlCount: galleryUrls.length,
				rooms: rooms.map((r) => ({
					name: r.name,
					imageFileCount: r.imageFiles.length,
					imageUrlCount: (roomUrlMap[r.id] || []).length,
				})),
			});

			if (uploadError) {
				setStatus("error");
				setErrorMessage(uploadError);
				return;
			}

			// ─── FASE 2: CONSTRUIR ESTADO CON URLs REALES ──────────────
			const wizardState = {
				hotelIdentity,
				galleryImages: galleryUrls,
				rooms: rooms.map((r) => ({
					id: r.id,
					name: r.name,
					type: r.type,
					price: r.price,
					description: r.description,
					amenities: r.amenities,
					capacity: r.capacity,
					beds: r.beds,
					imageUrls: roomUrlMap[r.id] || [],
					availabilityRange: null,
				})),
				settings,
				payment: {
					planId: undefined,
					price: 89900,
					transactionId: paymentTransactionId,
					paymentMethod: paymentMethod,
					manualReceiptUrl: manualReceiptUrl,
					manualPaymentMethod: manualPaymentMethod,
				},
			};

			// ─── FASE 3: VALIDAR Y PROVISIONAR ─────────────────────────
			setStatus("provisioning");

			const result = fullWizardStateSchema.safeParse(wizardState);
			if (!result.success) {
				// Phase 2: Visual Recovery Guide — map errors to human-readable actions
				const errorDetails = result.error.issues.map((issue) => {
					const path = issue.path.join(" > ");
					// Map to user-friendly message and target step
					if (path.includes("hotelIdentity.name"))
						return { msg: "Falta el nombre del hotel", step: 1 };
					if (path.includes("hotelIdentity.city"))
						return { msg: "Falta la ciudad o municipio", step: 1 };
					if (path.includes("hotelIdentity.location"))
						return { msg: "Falta la zona o vereda", step: 1 };
					if (path.includes("rooms") && path.includes("price"))
						return { msg: "Una habitación no tiene precio definido", step: 3 };
					if (path.includes("rooms") && path.includes("name"))
						return { msg: "Una habitación no tiene nombre", step: 3 };
					if (path.includes("checkInTime"))
						return { msg: "Falta el horario de llegada", step: 4 };
					if (path.includes("checkOutTime"))
						return { msg: "Falta el horario de salida", step: 4 };
					if (path.includes("galleryImages"))
						return {
							msg: "Se requieren al menos 3 fotos de la propiedad",
							step: 2,
						};
					return { msg: `Campo incompleto: ${issue.message}`, step: 1 };
				});

				setStatus("error");
				setErrorDetails(errorDetails);
				return;
			}

			const provisioningResult = await executeOnboardingProvisioning(
				result.data,
			);

			if (provisioningResult.success) {
				const slug = generateSlug(hotelIdentity.name);
				setHotelSlug(slug);
				// Duplicate fingerprint detected → show verification message
				if (provisioningResult.isDuplicate) {
					setStatus("duplicate_review");
				} else {
					// Both Wompi and Manual: hotel is published immediately (good faith policy)
					setStatus("success");
				}
			} else {
				setStatus("error");
				setErrorMessage(provisioningResult.error || t("errorTitle"));
			}
		}

		provision();
	}, []);

	// --------------------------------------------------------------------------
	// UPLOADING STATE
	// --------------------------------------------------------------------------
	if (status === "uploading") {
		const pct =
			uploadProgress.total > 0
				? Math.round((uploadProgress.current / uploadProgress.total) * 100)
				: 0;
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="py-24 text-center space-y-8"
			>
				<div className="relative w-24 h-24 mx-auto">
					<div className="absolute inset-0 border-t-2 border-cyan-500 rounded-full animate-spin" />
					<UploadCloud
						className="absolute inset-0 m-auto text-cyan-400/60"
						size={32}
					/>
				</div>
				<div className="space-y-4">
					<h3 className="text-xl font-bold text-white uppercase tracking-widest">
						Subiendo imágenes
					</h3>
					<p className="text-zinc-500 text-xs font-mono">
						{uploadProgress.current} de {uploadProgress.total}
					</p>
					<div className="w-64 mx-auto h-2 bg-zinc-800 rounded-full overflow-hidden">
						<motion.div
							className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
							initial={{ width: 0 }}
							animate={{ width: `${pct}%` }}
							transition={{ duration: 0.3 }}
						/>
					</div>
					<p className="text-zinc-600 text-xs font-mono">{pct}%</p>
				</div>
			</motion.div>
		);
	}

	// --------------------------------------------------------------------------
	// PROVISIONING STATE
	// --------------------------------------------------------------------------
	if (status === "provisioning") {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="py-24 text-center space-y-8"
			>
				<div className="relative w-24 h-24 mx-auto">
					<div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin" />
					<div className="absolute inset-2 border-r-2 border-emerald-500 rounded-full animate-spin direction-reverse duration-1000" />
					<Building2
						className="absolute inset-0 m-auto text-white/50"
						size={32}
					/>
				</div>
				<div className="space-y-2">
					<h3 className="text-xl font-bold text-white uppercase tracking-widest">
						{t("activating")}
					</h3>
					<p className="text-zinc-500 text-xs font-mono">{t("configuring")}</p>
				</div>
			</motion.div>
		);
	}

	// --------------------------------------------------------------------------
	// ERROR STATE — Visual Recovery Guide (Heuristic #9)
	// --------------------------------------------------------------------------
	if (status === "error") {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="py-12 space-y-8 max-w-lg mx-auto"
			>
				<AlertCircle className="mx-auto text-rose-500" size={48} />
				<div className="space-y-2 text-center">
					<h3 className="text-xl font-bold text-white">
						No se pudo activar la propiedad
					</h3>
					<p className="text-zinc-500 text-sm">
						Revisá los siguientes puntos y corregilos para continuar:
					</p>
				</div>

				{/* Visual Recovery Guide */}
				<div className="space-y-2">
					{errorDetails.length > 0 ? (
						errorDetails.map((detail, i) => (
							<div
								key={i}
								className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-lg)]"
							>
								<span className="text-rose-400 text-sm">❌</span>
								<span className="text-zinc-300 text-sm flex-1">
									{detail.msg}
								</span>
								<button
									onClick={() =>
										router.push(`/software/onboarding?step=${detail.step}`)
									}
									className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-[var(--radius-squircle-md)] hover:bg-rose-500/30 transition-colors"
								>
									Ir al paso {detail.step} →
								</button>
							</div>
						))
					) : (
						<div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-lg)]">
							<p className="text-rose-300 text-sm whitespace-pre-line">
								{errorMessage || t("errorTitle")}
							</p>
						</div>
					)}
				</div>

				<button
					onClick={() => window.location.reload()}
					className="w-full py-3 bg-zinc-800 border border-white/10 rounded-[var(--radius-squircle-xl)] text-white font-bold hover:bg-zinc-700 transition-colors"
				>
					{t("retry")}
				</button>
			</motion.div>
		);
	}

	// --------------------------------------------------------------------------
	// DUPLICATE REVIEW STATE — Hotel flagged, awaiting admin verification
	// --------------------------------------------------------------------------
	if (status === "duplicate_review") {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ type: "spring", stiffness: 300, damping: 24, mass: 1.0 }}
				className="py-12 space-y-10 max-w-lg mx-auto"
			>
				{/* Chunk 1: Verification notice */}
				<div className="text-center space-y-4">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{
							type: "spring",
							stiffness: 400,
							damping: 20,
							delay: 0.2,
						}}
						className="relative w-20 h-20 mx-auto"
					>
						<div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl" />
						<div className="relative w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
							<Clock className="text-amber-400" size={36} />
						</div>
					</motion.div>
					<h3 className="text-2xl font-black text-white tracking-tight">
						Propiedad en verificación
					</h3>
					<p className="text-zinc-400 text-sm">
						Detectamos un hotel con el mismo nombre en esta zona. Verificamos que no sea un duplicado.
					</p>
				</div>

				{/* Chunk 2: Hotel identity card */}
				<div className="glass-card p-6 space-y-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-brand-500 to-warm-600 flex items-center justify-center text-white font-black text-lg shrink-0">
							{hotelIdentity.name.charAt(0).toUpperCase()}
						</div>
						<div className="min-w-0">
							<p className="text-white font-bold text-sm truncate">
								{hotelIdentity.name}
							</p>
							<p className="text-zinc-500 text-xs">{hotelIdentity.city}</p>
						</div>
					</div>

					<div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-[var(--radius-squircle-lg)]">
						<Clock size={14} className="text-amber-400 shrink-0 mt-0.5" />
						<div>
							<p className="text-amber-300 text-xs font-bold">
								Revisión en curso
							</p>
							<p className="text-amber-300/80 text-xs mt-1">
								Un administrador revisará tu registro en las próximas 24 horas.
								Recibirás un email cuando tu propiedad esté activa.
							</p>
						</div>
					</div>

					<div className="border-t border-white/5 pt-3">
						<p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
							¿Por qué pasa esto?
						</p>
						<p className="text-zinc-400 text-xs leading-relaxed">
							Para proteger a los hoteleros, verificamos que no se creen
							cuentas duplicadas con el mismo nombre y ubicación. Si este es
							tu hotel y perdiste acceso, contactanos por WhatsApp.
						</p>
					</div>
				</div>

				{/* Chunk 3: Contact CTA */}
				<div className="space-y-3">
					<motion.button
						whileTap={{ scale: 0.98 }}
						onClick={() => {
							reset();
							router.push("/dashboard");
						}}
						className="w-full flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-[var(--radius-squircle-xl)] hover:bg-white/10 hover:border-indigo-500/30 transition-all group"
					>
						<div className="w-9 h-9 rounded-[var(--radius-squircle-lg)] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
							<LayoutDashboard size={16} className="text-indigo-400" />
						</div>
						<div className="text-left">
							<p className="text-white text-sm font-bold">Ir al Dashboard</p>
							<p className="text-zinc-500 text-xs">
								Te avisaremos cuando esté activo
							</p>
						</div>
					</motion.button>
				</div>

				{/* Chunk 4: Credentials */}
				<div className="text-center space-y-2">
					<p className="text-zinc-600 text-xs">
						Usá el email con el que te registraste para acceder al dashboard.
					</p>
				</div>
			</motion.div>
		);
	}

	// --------------------------------------------------------------------------
	// SUCCESS STATE — Both Wompi and Manual: hotel published immediately
	// Chunk 1: Confirmation + Hotel identity
	// Chunk 2: Access links (Channel page + Dashboard)
	// Chunk 3: Credentials (email used for auth)
	// --------------------------------------------------------------------------
	const hotelUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/hotel/${hotelSlug}`;
	const dashboardUrl = "/admin/dashboard";

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ type: "spring", stiffness: 300, damping: 24, mass: 1.0 }}
			className="py-12 space-y-10 max-w-lg mx-auto"
		>
			{/* Chunk 1: Confirmation — Saliencia visual en el check */}
			<div className="text-center space-y-4">
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{
						type: "spring",
						stiffness: 400,
						damping: 20,
						delay: 0.2,
					}}
					className="relative w-20 h-20 mx-auto"
				>
					<div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl" />
					<div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
						<CheckCircle2 className="text-emerald-400" size={36} />
					</div>
				</motion.div>
				<h3 className="text-2xl font-black text-white tracking-tight">
					{t("success")}
				</h3>
				<p className="text-zinc-400 text-sm">
					{hotelIdentity.name} está activa y lista para recibir reservas.
				</p>
			</div>

			{/* Chunk 2: Hotel identity card — Glassmorphism 2.0 */}
			<div className="glass-card p-6 space-y-4">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-brand-500 to-warm-600 flex items-center justify-center text-white font-black text-lg shrink-0">
						{hotelIdentity.name.charAt(0).toUpperCase()}
					</div>
					<div className="min-w-0">
						<p className="text-white font-bold text-sm truncate">
							{hotelIdentity.name}
						</p>
						<p className="text-zinc-500 text-xs">{hotelIdentity.city}</p>
					</div>
				</div>

				{/* Slug — copyable */}
				<div className="flex items-center justify-between bg-black/30 rounded-[var(--radius-squircle-lg)] px-3 py-2 border border-white/5">
					<div className="min-w-0">
						<p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
							Slug público
						</p>
						<p className="text-zinc-300 text-xs font-mono truncate">
							{hotelSlug}
						</p>
					</div>
					<button
						onClick={() => copyToClipboard(hotelSlug || "", "slug")}
						className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
					>
						{copiedField === "slug" ? (
							<Check size={14} className="text-emerald-400" />
						) : (
							<Copy size={14} className="text-zinc-400" />
						)}
					</button>
				</div>

				{/* Good faith note for manual payments */}
				{paymentMethod === "manual" && (
					<div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-[var(--radius-squircle-lg)]">
						<Clock size={14} className="text-amber-400 shrink-0 mt-0.5" />
						<div>
							<p className="text-amber-300 text-xs font-bold">
								Pago en verificación
							</p>
							<p className="text-amber-300/80 text-xs mt-1">
								Tu propiedad ya está publicada. Un administrador verificará tu
								comprobante de pago. Este proceso suele tomar entre 1 y 24
								horas.
							</p>
						</div>
					</div>
				)}
			</div>

			{/* Chunk 3: Access links — Ley de Hick: 2 opciones claras, no más */}
			<div className="space-y-3">
				<p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">
					Acceso rápido
				</p>

				<motion.button
					whileTap={{ scale: 0.98 }}
					onClick={() => {
						reset();
						router.push(hotelUrl);
					}}
					className="w-full flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-[var(--radius-squircle-xl)] hover:bg-white/10 hover:border-brand-500/30 transition-all group"
				>
					<div className="w-9 h-9 rounded-[var(--radius-squircle-lg)] bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
						<Globe size={16} className="text-brand-400" />
					</div>
					<div className="text-left min-w-0">
						<p className="text-white text-sm font-bold">Ver página pública</p>
						<p className="text-zinc-500 text-xs truncate">{hotelUrl}</p>
					</div>
					<ExternalLink
						size={14}
						className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0"
					/>
				</motion.button>

				<motion.button
					whileTap={{ scale: 0.98 }}
					onClick={() => {
						reset();
						router.push(dashboardUrl);
					}}
					className="w-full flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-[var(--radius-squircle-xl)] hover:bg-white/10 hover:border-indigo-500/30 transition-all group"
				>
					<div className="w-9 h-9 rounded-[var(--radius-squircle-lg)] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
						<LayoutDashboard size={16} className="text-indigo-400" />
					</div>
					<div className="text-left">
						<p className="text-white text-sm font-bold">Ir al Dashboard</p>
						<p className="text-zinc-500 text-xs">
							Administrar reservas, tarifas y Channels
						</p>
					</div>
					<ExternalLink
						size={14}
						className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0"
					/>
				</motion.button>
			</div>

			{/* Chunk 4: Credentials — Progressive disclosure */}
			<div className="text-center space-y-2">
				<p className="text-zinc-600 text-xs">
					Usá el email con el que te registraste para acceder al dashboard.
				</p>
			</div>
		</motion.div>
	);
}
