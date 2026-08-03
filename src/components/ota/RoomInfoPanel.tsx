import React from "react";
import {
	Star,
	Clock,
	Users,
	Info,
	ClipboardList,
	CreditCard,
	Landmark,
	Smartphone,
	HelpCircle,
} from "lucide-react";
import { format } from "date-fns";
import { GlassCard } from "@/components/ui/glass";
import { getRoomAmenityById } from "@/lib/amenity-registry";
import type { Room } from "@/types";
import { useTranslations } from "next-intl";
import { getDateFnsLocale } from "@/lib/date-locale";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { AmenityGlass } from "./RoomShowcaseModal";
import PriceBreakdown from "./PriceBreakdown";

interface RoomInfoPanelProps {
	room: Partial<Room> & { price_per_night?: number };
	checkIn: string;
	checkOut: string;
	defaultGuests: number;
	isOverCapacity: boolean;
	nights: number;
	taxRate?: number;
	variant?: "desktop" | "mobile";
	onAdjustGuests?: () => void;
	onSeeLargerRooms?: () => void;
	hasLargerRooms?: boolean;
	cancellationPolicy?: string | null;
}

export function RoomInfoPanel({
	room,
	checkIn,
	checkOut,
	defaultGuests,
	isOverCapacity,
	nights,
	taxRate = 0.19,
	variant = "desktop",
	onAdjustGuests,
	onSeeLargerRooms,
	hasLargerRooms,
	cancellationPolicy,
}: RoomInfoPanelProps) {
	const t = useTranslations();
	const appLocale = useLocale();
	const dateLocale = getDateFnsLocale(appLocale);

	const dateFrom = new Date(checkIn);
	const dateTo = new Date(checkOut);

	const isDesktop = variant === "desktop";

	return (
		<div className={cn("space-y", isDesktop ? "space-y-6" : "space-y-5")}>
			{/* Nombre + Descripcion */}
			<div className={cn("space-y", isDesktop ? "space-y-4" : "space-y-3")}>
				<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warm-500/10 backdrop-blur-xl border border-warm-500/20 text-warm-700 text-[10px] font-bold uppercase tracking-widest">
					<Star size={11} className="fill-warm-500" />{" "}
					{t("ota.showcase.authorsPick")}
				</span>
				<h2
					id="room-modal-title"
					className={cn(
						"font-black text-foreground tracking-tight",
						isDesktop ? "text-3xl xl:text-4xl leading-tight" : "text-2xl"
					)}
				>
					{room.name}
				</h2>
			</div>

			{/* Precio destacado */}
			<GlassCard data-testid="modal-price" className={cn(isDesktop ? "p-5" : "p-4")}>
				<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
					<div>
						<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
							{t("ota.showcase.total")}
						</p>
						<p className="text-2xl sm:text-3xl font-black text-foreground">
							${((room.price_per_night ?? room.price ?? 0) * nights).toLocaleString()}{" "}
							<span className="text-sm font-medium text-muted-foreground">
								{t("ota.showcase.cop")}
							</span>
						</p>
					</div>
					<PriceBreakdown
						pricePerNight={room.price_per_night ?? room.price ?? 0}
						nights={nights}
						taxRate={taxRate}
						showDetails={false}
					/>
				</div>
			</GlassCard>

			{/* Amenidades */}
			{room.amenities && room.amenities.length > 0 && (
				<GlassCard className={cn(isDesktop ? "p-5" : "p-4")}>
					<h3
						className={cn(
							"text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2",
							isDesktop ? "mb-4" : "mb-3"
						)}
					>
						<span className="size-1.5 rounded-full bg-brand-400" />
						{t("ota.showcase.amenities")}
					</h3>
					<div
						className={cn(
							"grid gap",
							isDesktop
								? "grid-cols-1 xl:grid-cols-2 gap-1"
								: "grid-cols-4 sm:grid-cols-6 gap-2"
						)}
					>
						{room.amenities.map(
							(amenity: string | { id: string; details?: string }, idx: number) => {
								const id = typeof amenity === "string" ? amenity : amenity.id;
								const entry = getRoomAmenityById(id);
								if (!entry) return null;

								const template = entry.storyTitle
									? {
											icon: entry.icon,
											title: entry.storyTitle,
											story: isDesktop
												? entry.storyDescription || t("ota.showcase.premiumService")
												: "",
										}
									: {
											icon: entry.icon,
											title: isDesktop ? entry.label.toUpperCase() : entry.label,
											story: isDesktop ? t("ota.showcase.premiumService") : "",
										};

								return (
									<AmenityGlass
										key={idx}
										icon={template.icon}
										title={template.title}
										story={template.story}
										compact={!isDesktop}
									/>
								);
							}
						)}
					</div>
				</GlassCard>
			)}

			{/* Resumen de Reserva */}
			<GlassCard className={cn(isDesktop ? "p-5" : "p-4")}>
				<h3
					className={cn(
						"text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2",
						isDesktop ? "mb-4" : "mb-3"
					)}
				>
					<ClipboardList size={13} className="text-brand-500" />
					{t("ota.showcase.bookingSummary")}
				</h3>
				<div className={cn("space-y", isDesktop ? "space-y-4" : "space-y-3")}>
					{/* Fechas */}
					<div className="flex justify-between items-center">
						<div>
							<p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
								<Clock size={10} /> {t("ota.showcase.stay")}
							</p>
							<p className="text-sm font-bold text-foreground">
								{format(dateFrom, "dd MMM", { locale: dateLocale })} —{" "}
								{format(dateTo, "dd MMM", { locale: dateLocale })}
							</p>
						</div>
						<div className="px-3 py-1.5 glass-card !rounded-[var(--radius-squircle-lg)]">
							<span className="text-xs font-bold text-foreground/80">
								{nights} {t("ota.showcase.nights", { count: nights })}
							</span>
						</div>
					</div>

					{/* Ocupacion */}
					<div className="flex justify-between items-center pt-3 border-t border-border/40">
						<div>
							<p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
								{t("ota.showcase.occupancy")}
							</p>
							<p className="text-sm font-bold text-foreground">
								{defaultGuests}{" "}
								{t("ota.showcase.guest", { count: defaultGuests })} (Capacidad máx:{" "}
								{room.capacity ?? 0})
							</p>
						</div>
						<Users size={16} className="text-muted-foreground/40" />
					</div>

					{/* Alerta de capacidad */}
					{isOverCapacity && (
						<div className="flex flex-col gap-2 p-3 glass-card border-destructive/20 text-destructive">
							<div className="flex gap-2">
								<Info size={14} className="shrink-0 mt-0.5" />
								<div>
									<p className="text-xs font-bold mb-1">
										{t("ota.showcase.overCapacity")}
									</p>
									<p className="text-[10px] leading-tight">
										{isDesktop
											? t("ota.showcase.overCapacityDesc", {
													capacity: room.capacity ?? 0,
												})
											: t("ota.showcase.overCapacityDescShort", {
													capacity: room.capacity ?? 0,
												})}
									</p>
								</div>
							</div>
							<div className="flex gap-2 mt-1 ml-6">
								{onAdjustGuests && (
									<button
										onClick={onAdjustGuests}
										className="text-[10px] font-bold underline underline-offset-2 hover:text-destructive/70 transition-colors"
									>
										{t("ota.showcase.adjustGuests")}
									</button>
								)}
								{hasLargerRooms && onSeeLargerRooms && (
									<button
										onClick={onSeeLargerRooms}
										className="text-[10px] font-bold text-brand-600 underline underline-offset-2 hover:text-brand-500 transition-colors"
									>
										{t("ota.showcase.seeLargerRooms")}
									</button>
								)}
							</div>
						</div>
					)}

					</div>
			</GlassCard>

			{/* Política de cancelación */}
			<GlassCard data-testid="modal-policies" className={cn(isDesktop ? "p-5" : "p-4")}>
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1 min-w-0">
						<h3
							className={cn(
								"text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2",
								isDesktop ? "mb-2" : "mb-1.5"
							)}
						>
							<Info size={13} className="text-brand-500" />
							{t("ota.showcase.cancellationPolicy")}
						</h3>
						<p className="text-sm font-semibold text-foreground leading-relaxed">
							{cancellationPolicy || t("ota.showcase.noPolicy")}
						</p>
					</div>
					<button
						type="button"
						className="shrink-0 size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-brand-600 hover:bg-brand-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
						aria-label={t("ota.showcase.cancellationPolicyHelp")}
						title={t("ota.showcase.cancellationPolicyHelp")}
					>
						<HelpCircle size={16} />
					</button>
				</div>
			</GlassCard>

			{/* Métodos de pago */}
			<GlassCard data-testid="modal-payment" className={cn(isDesktop ? "p-5" : "p-4")}>
				<h3
					className={cn(
						"text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2",
						isDesktop ? "mb-4" : "mb-3"
					)}
				>
					<CreditCard size={13} className="text-brand-500" />
					{t("ota.showcase.paymentMethods")}
				</h3>
				<div className={cn("grid gap-3", isDesktop ? "grid-cols-3" : "grid-cols-3")}>
					<div
						className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-brand-500/5 to-warm-400/5 border border-brand-500/10"
						aria-label={t("ota.showcase.cards")}
					>
						<CreditCard size={22} className="text-brand-500" strokeWidth={1.5} />
						<span className="text-[10px] font-semibold text-center leading-tight">
							{t("ota.showcase.cards")}
						</span>
					</div>
					<div
						className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-brand-500/5 to-warm-400/5 border border-brand-500/10"
						aria-label={t("ota.showcase.pse")}
					>
						<Landmark size={22} className="text-brand-500" strokeWidth={1.5} />
						<span className="text-[10px] font-semibold text-center leading-tight">
							{t("ota.showcase.pse")}
						</span>
					</div>
					<div
						className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-brand-500/5 to-warm-400/5 border border-brand-500/10"
						aria-label={t("ota.showcase.nequi")}
					>
						<Smartphone size={22} className="text-brand-500" strokeWidth={1.5} />
						<span className="text-[10px] font-semibold text-center leading-tight">
							{t("ota.showcase.nequi")}
						</span>
					</div>
				</div>
			</GlassCard>
		</div>
	);
}
