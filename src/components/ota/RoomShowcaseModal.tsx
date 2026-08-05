"use client";

import React, { useMemo, useRef, useCallback, useEffect } from "react";
import { X, ArrowRight, Calendar, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateTotalWithTax, DEFAULT_TAX_RATE } from "@/lib/pricing";
import { parseISO } from "date-fns";
import type { Room, GalleryItem } from "@/types";
import RoomGalleryGrid from "./RoomGalleryGrid";
import { RoomInfoPanel } from "./RoomInfoPanel";
import { AmenityGlass } from "./AmenityGlass";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useModalAccessibility } from "@/hooks/useModalAccessibility";
import { useBookingAnalytics } from "@/hooks/useBookingAnalytics";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import { AnimatePresence, motion } from "framer-motion";
import { MOTION_DURATION, MOTION_EASING } from "@/lib/motion-tokens";

interface HotelForModal {
	id?: string;
	slug: string;
	name?: string;
	rooms?: Array<Partial<Room> & { price_per_night?: number }>;
	tax_rate?: number;
	tax_regime?: 'simplified' | 'responsible';
	cancellation_policy?: string | null;
}

function isRoomAvailable(room?: Partial<Room>): boolean {
	return room?.status === 'active';
}

// GlassCard imported from @/components/ui/glass (design system, theme-aware)

export function RoomShowcaseModal({
	hotel,
	hotelId,
	onClose,
	onCheckout,
}: {
	hotel: HotelForModal;
	hotelId?: string;
	onClose: () => void;
	onCheckout: (roomId: string, guests: number) => void;
}) {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const { isProcessing, handleReserve } = useBookingFlow();

	const roomId = searchParams.get("showRoom");
	const checkIn = searchParams.get("checkin");
	const checkOut = searchParams.get("checkout");
	const guests = Number(searchParams.get("guests")) || 0;

	// Default guest count for booking (can be adjusted in checkout)
	const defaultGuests = guests > 0 ? guests : 2;

	const room = useMemo(
		() => hotel.rooms?.find((r) => r.id === roomId),
		[hotel.rooms, roomId],
	);

	const nights = useMemo(() => {
		if (!checkIn || !checkOut) return 1;
		const dateFrom = parseISO(checkIn);
		const dateTo = parseISO(checkOut);
		return Math.max(
			1,
			Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 3600 * 24)),
		);
	}, [checkIn, checkOut]);

	const basePrice = room?.price_per_night || room?.price || 0;
	const effectiveRate = hotel.tax_rate ?? DEFAULT_TAX_RATE;

	const {
		trackOpenRoomModal,
		trackCloseRoomModal,
		trackAbandonBooking,
	} = useBookingAnalytics({
		hotelId,
		roomId: roomId ?? undefined,
		price: basePrice,
		nights,
		hasDates: !!checkIn && !!checkOut,
		taxRate: effectiveRate,
	});

	const modalOpenTime = useRef<number | null>(null);
	const trackedRoomId = useRef<string | null>(null);

	useEffect(() => {
		if (!hotelId || !roomId || !room || roomId === trackedRoomId.current) return;
		trackOpenRoomModal({ source: 'card' });
		modalOpenTime.current = Date.now();
		trackedRoomId.current = roomId;
	}, [hotelId, roomId, room, trackOpenRoomModal]);

	const handleClose = useCallback(
		(action: 'reserve' | 'back' | 'esc') => {
			if (hotelId && roomId) {
				trackCloseRoomModal({ action });
				if (action !== 'reserve' && modalOpenTime.current) {
					trackAbandonBooking({
						step: 'modal',
						time_spent: Math.round((Date.now() - modalOpenTime.current) / 1000),
					});
				}
			}
			onClose();
		},
		[hotelId, roomId, trackCloseRoomModal, trackAbandonBooking, onClose]
	);

	// Accessibility: focus trap, ESC handler, scroll lock, ARIA
	const { modalRef, ariaProps } = useModalAccessibility(!!roomId, () => handleClose('esc'), 'room-modal-title');

	if (!roomId) return null;

	// ESCUDO UX: Fechas Faltantes
	if (!checkIn || !checkOut) {
		return (
			<div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
				<div
					data-testid="modal-backdrop"
					className="absolute inset-0 bg-foreground/40 backdrop-blur-xl"
					onClick={() => handleClose('back')}
				/>
				<div className="relative z-10 glass-panel p-10 w-full max-w-md text-center shadow-2xl shadow-elev-2 animate-in zoom-in-95 duration-200">
					<div className="size-16 rounded-[var(--radius-squircle-2xl)] bg-gradient-to-br from-brand-500/10 to-warm-400/10 border border-brand-500/15 flex items-center justify-center mx-auto mb-6">
						<Calendar size={28} className="text-brand-500" strokeWidth={1.5} />
					</div>
					<h2 className="text-2xl font-black text-foreground mb-2">
						{t("ota.showcase.defineStay")}
					</h2>
					<p className="text-muted-foreground mb-8 text-sm">
						{t("ota.showcase.defineStayDesc")}
					</p>
					<button
						onClick={() => {
							handleClose('back');
							window.scrollTo({ top: 0, behavior: "smooth" });
						}}
						className="w-full glass-card text-foreground font-semibold py-4 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-[0.98]"
					>
						{t("ota.showcase.selectDates")} <ArrowRight size={18} />
					</button>
				</div>
			</div>
		);
	}

	if (!room) return null;

	if (!isRoomAvailable(room)) {
		return (
			<AnimatePresence>
				<motion.div
					ref={modalRef}
					{...ariaProps}
					className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center sm:p-3 lg:p-5"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					{/* Backdrop */}
					<motion.div
						data-testid="modal-backdrop"
						className="absolute inset-0 bg-foreground/50 backdrop-blur-2xl"
						onClick={() => handleClose('back')}
						aria-hidden="true"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
					/>

					{/* Sold-out card */}
					<motion.div
						className="relative w-full max-w-md flex flex-col overflow-hidden sm:rounded-[var(--radius-squircle-2xl)] rounded-t-[2rem] glass-panel p-8 text-center"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={{
							duration: MOTION_DURATION.normal / 1000,
							ease: MOTION_EASING.easeOut,
						}}
					>
						<button
							aria-label="Cerrar"
							onClick={() => handleClose('back')}
							className="absolute top-4 right-4 z-30 size-10 flex items-center justify-center rounded-full glass-pill text-foreground/70 hover:bg-accent/25 hover:scale-110 hover:text-foreground transition-all shadow-lg shadow-elev-1 active:scale-95"
						>
							<X size={18} strokeWidth={2.5} />
						</button>

						<div className="size-16 rounded-[var(--radius-squircle-2xl)] bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-6">
							<AlertTriangle size={28} strokeWidth={1.5} />
						</div>

						<h2 className="text-2xl font-black text-foreground mb-2">
							{t("ota.showcase.soldOut")}
						</h2>
						<p className="text-muted-foreground mb-8 text-sm">
							{t("ota.showcase.soldOutDesc")}
						</p>

						<button
							onClick={() => {
								handleClose('back');
								const section = document.getElementById("rooms-section");
								if (section) section.scrollIntoView({ behavior: "smooth" });
							}}
							className="w-full glass-card text-foreground font-semibold py-4 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-[0.98]"
						>
							{t("ota.showcase.seeOtherRooms")} <ArrowRight size={18} />
						</button>
					</motion.div>
				</motion.div>
			</AnimatePresence>
		);
	}

	const subtotal = basePrice * nights;
	const { total: totalPrice } = calculateTotalWithTax(subtotal, effectiveRate);
	const isOverCapacity = defaultGuests > Number(room.capacity ?? 0);

	// handleCheckout delegated to parent via onCheckout callback

	const rawGallery = room.gallery ?? [];
	const images: GalleryItem[] = Array.isArray(rawGallery)
		? (rawGallery as (string | GalleryItem)[]).map((img) =>
				typeof img === "string" ? { url: img } : img,
			)
		: [];
	if (images.length === 0) {
		images.push({ url: "/logo.png" });
	}

	return (
		<AnimatePresence>
			<motion.div 
				ref={modalRef}
				{...ariaProps}
				className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center sm:p-3 lg:p-5"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.2 }}
			>
				{/* Backdrop con blur pesado */}
				<motion.div
					data-testid="modal-backdrop"
					className="absolute inset-0 bg-foreground/50 backdrop-blur-2xl"
					onClick={() => handleClose('back')}
					aria-hidden="true"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				/>

				{/* MODAL CONTAINER — Liquid Glass */}
				<motion.div
					className="relative w-full max-w-7xl h-[96vh] sm:h-[92vh] flex flex-col overflow-hidden sm:rounded-[var(--radius-squircle-2xl)] rounded-t-[2rem] glass-panel"
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.95 }}
					transition={{
						duration: MOTION_DURATION.normal / 1000,
						ease: MOTION_EASING.easeOut,
					}}
				>
				{/* Boton cerrar glass */}
				<button
					aria-label="Cerrar"
					onClick={() => handleClose('back')}
					className="absolute top-4 right-4 z-30 size-10 flex items-center justify-center rounded-full glass-pill text-foreground/70 hover:bg-accent/25 hover:scale-110 hover:text-foreground transition-all shadow-lg shadow-elev-1 active:scale-95"
				>
					<X size={18} strokeWidth={2.5} />
				</button>

				{/* DESKTOP: 2-column grid layout — gallery + info side by side */}
				<div className="hidden lg:grid lg:grid-cols-2 lg:gap-0 lg:flex-1 overflow-hidden">
					{/* Columna izquierda: Galería (scrollable) */}
					<div className="flex flex-col overflow-y-auto bg-foreground">
						<div className="shrink-0 p-4">
							<RoomGalleryGrid
								images={images}
								roomName={room.name ?? t("ota.showcase.fallbackRoom")}
							/>
						</div>
					</div>

					{/* Columna derecha: Info + Resumen (scrollable, fondo claro) */}
					<div className="flex flex-col overflow-hidden bg-gradient-to-b from-muted/80 to-background/60">
						{/* Contenido scrolleable */}
						<div className="flex-1 overflow-y-auto custom-scrollbar">
							<div className="p-7 xl:p-9">
								<RoomInfoPanel
									room={room}
									checkIn={checkIn}
									checkOut={checkOut}
									defaultGuests={defaultGuests}
									isOverCapacity={isOverCapacity}
									nights={nights}
									taxRate={hotel.tax_rate ?? 0.19}
									variant="desktop"
									cancellationPolicy={hotel.cancellation_policy}
									onAdjustGuests={() => {
										handleClose('back');
										window.scrollTo({ top: 0, behavior: "smooth" });
									}}
									onSeeLargerRooms={() => {
										handleClose('back');
										const section = document.getElementById("rooms-section");
										if (section) section.scrollIntoView({ behavior: "smooth" });
									}}
									hasLargerRooms={
										hotel.rooms?.some(
											(r) => Number(r.capacity ?? 0) > Number(room.capacity ?? 0)
										) ?? false
									}
								/>
							</div>
						</div>

					{/* Dock de cierre — barra flotante glass */}
					<div data-testid="modal-cta" className="shrink-0 p-4 sticky bottom-0 bg-gradient-to-t from-background/80 to-transparent backdrop-blur-xl z-20">
						<div className="flex items-center justify-between px-5 py-4 glass-card">
								<div>
									<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-ultra mb-0.5">
										{t("ota.showcase.total")}
									</p>
									<p className="text-xl font-black text-foreground">
										${totalPrice.toLocaleString()}{" "}
										<span className="text-xs font-medium text-muted-foreground">
											{t("ota.showcase.cop")}
										</span>
									</p>
								</div>
								<button
									disabled={isOverCapacity || isProcessing}
									onClick={() => handleReserve(() => {
										handleClose('reserve');
										onCheckout(room.id!, defaultGuests);
									})}
									className={cn(
										"px-7 py-3.5 rounded-[var(--radius-squircle-lg)] font-semibold text-foreground transition-all flex items-center justify-center gap-2 active:scale-[0.97] shadow-cta",
										isOverCapacity || isProcessing
											? "bg-muted/60 text-muted-foreground cursor-not-allowed"
											: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-cta hover:shadow-cta",
									)}
								>
									{isOverCapacity
										? t("ota.showcase.adjustSearch")
										: isProcessing
											? "Procesando..."
											: t("ota.showcase.reserve")}{" "}
									<ArrowRight size={16} strokeWidth={2.5} />
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* MOBILE/ TABLET STACKED (< lg) — Single scroll container */}
				<div className="lg:hidden flex flex-col flex-1 overflow-hidden bg-gradient-to-b from-muted/80 to-background/60">
					{/* Scroll unificado: galería + amenidades + resumen + CTA sticky (Miller's Law: 3 chunks, 1 scroll) */}
					<div className="flex-1 overflow-y-auto custom-scrollbar">
						{/* Galeria — ahora con grid asimétrico */}
						<div className="p-2">
							<RoomGalleryGrid
								images={images}
								roomName={room.name ?? t("ota.showcase.fallbackRoom")}
							/>
						</div>

						{/* Info scrolleable */}
						<div className="px-4 py-5">
							<RoomInfoPanel
								room={room}
								checkIn={checkIn}
								checkOut={checkOut}
								defaultGuests={defaultGuests}
								isOverCapacity={isOverCapacity}
									nights={nights}
									taxRate={hotel.tax_rate ?? 0.19}
									variant="mobile"
									cancellationPolicy={hotel.cancellation_policy}
									onAdjustGuests={() => {
										handleClose('back');
										window.scrollTo({ top: 0, behavior: "smooth" });
									}}
									onSeeLargerRooms={() => {
										handleClose('back');
										const section = document.getElementById("rooms-section");
										if (section) section.scrollIntoView({ behavior: "smooth" });
									}}
									hasLargerRooms={
										hotel.rooms?.some(
											(r) => Number(r.capacity ?? 0) > Number(room.capacity ?? 0)
										) ?? false
									}
								/>
						</div>

					{/* Dock de cierre mobile — sticky al bottom del scroll */}
					<div data-testid="modal-cta" className="sticky bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background/80 to-transparent backdrop-blur-xl z-20">
						<div className="flex items-center justify-between px-5 py-4 glass-card">
							<div>
								<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-ultra mb-0.5">
									{t("ota.showcase.total")}
								</p>
								<p className="text-xl font-black text-foreground">
									${totalPrice.toLocaleString()}{" "}
									<span className="text-xs font-medium text-muted-foreground">
										{t("ota.showcase.cop")}
									</span>
								</p>
							</div>
							<button
								disabled={isOverCapacity || isProcessing}
								onClick={() => handleReserve(() => {
									handleClose('reserve');
									onCheckout(room.id!, defaultGuests);
								})}
								className={cn(
									"px-7 py-3.5 rounded-[var(--radius-squircle-lg)] font-semibold text-foreground transition-all flex items-center justify-center gap-2 active:scale-[0.97]",
									isOverCapacity || isProcessing
										? "bg-muted/60 text-muted-foreground cursor-not-allowed"
										: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-cta hover:shadow-cta",
								)}
							>
								{isOverCapacity
									? t("ota.showcase.adjust")
									: isProcessing
										? "Procesando..."
										: t("ota.showcase.reserve")}{" "}
								<ArrowRight size={16} strokeWidth={2.5} />
							</button>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
		</motion.div>
	</AnimatePresence>
	);
}
