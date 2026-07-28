import React from "react";
import { Star, Clock, Users, Info, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { GlassCard } from "@/components/ui/glass";
import { getRoomAmenityById } from "@/lib/amenity-registry";
import type { Room } from "@/types";
import { useTranslations } from "next-intl";
import { getDateFnsLocale } from "@/lib/date-locale";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { AmenityGlass } from "./RoomShowcaseModal";

interface RoomInfoPanelProps {
	room: Partial<Room> & { price_per_night?: number };
	checkIn: string;
	checkOut: string;
	defaultGuests: number;
	isOverCapacity: boolean;
	totalPrice: number;
	nights: number;
	variant?: "desktop" | "mobile";
	onAdjustGuests?: () => void;
	onSeeLargerRooms?: () => void;
	hasLargerRooms?: boolean;
}

export function RoomInfoPanel({
	room,
	checkIn,
	checkOut,
	defaultGuests,
	isOverCapacity,
	totalPrice,
	nights,
	variant = "desktop",
	onAdjustGuests,
	onSeeLargerRooms,
	hasLargerRooms,
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
				<p className="text-[15px] text-muted-foreground font-lora leading-relaxed italic">
					{room.description || t("ota.showcase.fallbackDescription")}
				</p>
			</div>

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

					{/* Desglose financiero */}
					<div className="pt-3 border-t border-border/40">
						<div className="flex justify-between items-center mb-1">
							<span className="text-xs font-medium text-muted-foreground">
								{t("ota.showcase.baseRate")} ({nights}{" "}
								{t("ota.showcase.nights", { count: nights })})
							</span>
							<span className="text-sm font-bold text-foreground">
								${totalPrice.toLocaleString()}
							</span>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-xs font-medium text-muted-foreground">
								{t("ota.showcase.taxesAndFees")}
							</span>
							<span className="text-[10px] font-bold bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full uppercase">
								{t("ota.showcase.included")}
							</span>
						</div>
					</div>
				</div>
			</GlassCard>
		</div>
	);
}
