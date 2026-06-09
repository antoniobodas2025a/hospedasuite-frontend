"use client";

import {
	useState,
	useRef,
	useEffect,
	useTransition,
	useCallback,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
	Calendar as CalendarIcon,
	X,
	User,
	MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker, DateRange } from "react-day-picker";
import { format, parseISO, isValid, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import {
	springSnappy,
	springModal,
	springBounce,
} from "@/lib/mac2026/spring";
import { GlassPanel } from "@/components/ui/glass";
import GuestSelector from "@/components/ota/GuestSelector";
import LocationAutocomplete from "@/components/ota/LocationAutocomplete";
import "react-day-picker/dist/style.css";

import { useTranslations, useLocale } from "next-intl";
import { getDateFnsLocale } from "@/lib/date-locale";

interface SearchBarUnifiedProps {
	onSearch?: (filters: {
		location: string;
		checkin: string | null;
		checkout: string | null;
		guests: number;
	}) => void;
}

export default function SearchBarUnified({ onSearch }: SearchBarUnifiedProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const t = useTranslations();
	const appLocale = useLocale();
	const dateLocale = getDateFnsLocale(appLocale);
	const containerRef = useRef<HTMLDivElement>(null);
	const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const [isPending, startTransition] = useTransition();
	const [activeModal, setActiveModal] = useState<"dates" | "guests" | null>(
		null,
	);

	// State: location — sync from URL params on mount and on param change
	const [location, setLocation] = useState(searchParams.get("location") || "");
	useEffect(() => {
		const urlLoc = searchParams.get("location") || "";
		if (urlLoc && urlLoc !== location) setLocation(urlLoc);
	}, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

	// State: dates
	const [date, setDate] = useState<DateRange | undefined>(() => {
		const ci = searchParams.get("checkin"),
			co = searchParams.get("checkout");
		if (ci && co) {
			const f = parseISO(ci),
				to = parseISO(co);
			if (isValid(f) && isValid(to)) return { from: f, to };
		}
		return undefined;
	});
	const [pendingDate, setPendingDate] = useState<DateRange | undefined>(date);

	// State: guests
	const [guests, setGuests] = useState<number>(() => {
		const g = searchParams.get("guests");
		return g ? Number(g) : 1;
	});
	const [pendingGuests, setPendingGuests] = useState<number>(guests);

	const today = startOfDay(new Date());

	// Sync pending state when modal opens
	useEffect(() => {
		if (activeModal === "dates") setPendingDate(date);
		if (activeModal === "guests") setPendingGuests(guests);
	}, [activeModal, date, guests]);

	// Close modal on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setActiveModal(null);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// URL sync
	const pushUrl = useCallback(
		(overrides?: {
			checkin?: Date;
			checkout?: Date;
			guests?: number;
			location?: string;
		}) => {
			const p = new URLSearchParams(searchParams.toString());
			const { checkin, checkout, guests: g, location: loc } = overrides || {};

			if (checkin && checkout) {
				p.set("checkin", format(checkin, "yyyy-MM-dd"));
				p.set("checkout", format(checkout, "yyyy-MM-dd"));
			} else {
				p.delete("checkin");
				p.delete("checkout");
			}

			if (g !== undefined && g > 0) {
				p.set("guests", g.toString());
			} else {
				p.delete("guests");
			}

			if (loc !== undefined) {
				if (loc === "") p.delete("location");
				else p.set("location", loc);
			}

			const query = p.toString();
			const url = query ? `${pathname}?${query}` : pathname;
			startTransition(() => router.push(url, { scroll: false }));
		},
		[searchParams, pathname, router],
	);

	// Handlers: Dates
	const handleSelectDates = (newDate: DateRange | undefined) => {
		if (newDate?.from && newDate?.to) {
			if (newDate.from.getTime() === newDate.to.getTime()) {
				setPendingDate({ from: newDate.from, to: undefined });
				return;
			}
			setPendingDate(newDate);
		} else {
			setPendingDate(newDate);
		}
	};

	const handleConfirmDates = () => {
		if (pendingDate?.from && pendingDate?.to) {
			setDate(pendingDate);
			setActiveModal(null);
			pushUrl({ checkin: pendingDate.from, checkout: pendingDate.to });
			onSearch?.({
				location,
				checkin: format(pendingDate.from, "yyyy-MM-dd"),
				checkout: format(pendingDate.to, "yyyy-MM-dd"),
				guests,
			});
		}
	};

	const handleClearDates = () => {
		setPendingDate(undefined);
		setDate(undefined);
		pushUrl({ checkin: undefined, checkout: undefined });
		onSearch?.({ location, checkin: null, checkout: null, guests });
	};

	// Handlers: Guests
	const handleConfirmGuests = () => {
		setGuests(pendingGuests);
		setActiveModal(null);
		pushUrl({ guests: pendingGuests });
		onSearch?.({
			location,
			checkin: date?.from ? format(date.from, "yyyy-MM-dd") : null,
			checkout: date?.to ? format(date.to, "yyyy-MM-dd") : null,
			guests: pendingGuests,
		});
	};

	// Handlers: Location — with 300ms debounce to prevent rapid-fire POSTs
	const handleLocationChange = (val: string) => {
		setLocation(val);

		if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
		locationDebounceRef.current = setTimeout(() => {
			pushUrl({ location: val });
			onSearch?.({
				location: val,
				checkin: date?.from ? format(date.from, "yyyy-MM-dd") : null,
				checkout: date?.to ? format(date.to, "yyyy-MM-dd") : null,
				guests,
			});
		}, 300);
	};

	// Derived
	const displayRange = () => {
		if (date?.from) {
			if (!date.to)
				return (
					format(date.from, "dd 'de' MMM", { locale: dateLocale }) +
					` — ${t("ota.search.departure")}`
				);
			return `${format(date.from, "dd MMM", { locale: dateLocale })} — ${format(date.to, "dd MMM", { locale: dateLocale })}`;
		}
		return `${t("ota.search.checkin")} — ${t("ota.search.checkout")}`;
	};
	const guestLabel = `${guests} ${t("ota.search.guest", { count: guests })}`;

	return (
		<div ref={containerRef} className="relative w-full">
			{/* UNIFIED SEARCH BAR — 3 zones */}
			<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
				{/* ZONE 1: LOCATION */}
				<div className="flex-1 flex items-center gap-2 px-3 py-2 sm:py-3 sm:rounded-l-full sm:rounded-r-none bg-card border border-border/50 sm:border-r-0 hover:border-border transition-colors cursor-text">
					<MapPin size={18} className="text-muted-foreground/50 shrink-0" />
					<div className="flex-1 min-w-0">
						<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
							{t("ota.search.destination")}
						</p>
						<LocationAutocomplete
							value={location}
							onChange={handleLocationChange}
							placeholder={t("ota.search.placeholder")}
						/>
					</div>
					{/* Clear button — Heurística #3: Control del usuario */}
					{location && (
						<motion.button
							initial={{ scale: 0, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0, opacity: 0 }}
							transition={springSnappy()}
							onClick={() => {
								setLocation("");
								pushUrl({ location: "" });
								onSearch?.({
									location: "",
									checkin: date?.from ? format(date.from, "yyyy-MM-dd") : null,
									checkout: date?.to ? format(date.to, "yyyy-MM-dd") : null,
									guests,
								});
							}}
							className="size-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors shrink-0 mr-1"
							aria-label="Limpiar ubicación"
						>
							<X size={12} strokeWidth={2.5} />
						</motion.button>
					)}
				</div>

				{/* ZONE 2: DATES */}
				<div
					onClick={() =>
						!isPending &&
						setActiveModal(activeModal === "dates" ? null : "dates")
					}
					role="button"
					aria-expanded={activeModal === "dates"}
					aria-label={t("ota.search.selectDates")}
					className="flex-1 flex items-center gap-2 px-3 py-2 sm:py-3 bg-card border border-border/50 sm:border-x-0 hover:border-border transition-colors cursor-pointer"
				>
					<CalendarIcon
						size={18}
						className={cn(
							"shrink-0",
							date?.from && date?.to
								? "text-secondary"
								: "text-muted-foreground/50",
						)}
					/>
					<div className="flex-1 min-w-0">
						<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
							{t("ota.search.stay")}
						</p>
						<p
							className={cn(
								"text-sm truncate",
								date?.from
									? "text-foreground font-bold"
									: "text-muted-foreground/50",
							)}
						>
							{displayRange()}
						</p>
					</div>
					{date?.from && (
						<motion.button
							initial={{ scale: 0, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0, opacity: 0 }}
							transition={springSnappy()}
							onClick={(e) => {
								e.stopPropagation();
								handleClearDates();
							}}
							className="size-5 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
							aria-label={t("ota.search.clearDates")}
						>
							<X size={10} strokeWidth={2.5} />
						</motion.button>
					)}
				</div>

				{/* ZONE 3: GUESTS */}
				<div
					onClick={() =>
						!isPending &&
						setActiveModal(activeModal === "guests" ? null : "guests")
					}
					role="button"
					aria-expanded={activeModal === "guests"}
					aria-label={t("ota.search.selectGuests")}
					className="flex-1 flex items-center gap-2 px-3 py-2 sm:py-3 bg-card border border-border/50 sm:border-l-0 sm:rounded-r-full sm:rounded-l-none hover:border-border transition-colors cursor-pointer"
				>
					<User size={18} className="text-muted-foreground/50 shrink-0" />
					<div className="flex-1 min-w-0">
						<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
							{t("ota.search.guests")}
						</p>
						<p className="text-sm text-foreground font-bold truncate">
							{guestLabel}
						</p>
					</div>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════ */}
			{/* UNIFIED MODAL SYSTEM — backdrop + glass container          */}
			{/* ═══════════════════════════════════════════════════════════ */}
			<AnimatePresence>
				{activeModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="fixed inset-0 z-[var(--z-modal)] flex items-end md:items-center md:justify-center"
					>
						{/* Backdrop overlay */}
						<div
							className="absolute inset-0 bg-black/20 backdrop-blur-sm"
							onClick={() => setActiveModal(null)}
							aria-hidden="true"
						/>

						{/* Modal container */}
						<motion.div
							initial={{ opacity: 0, y: "100%" }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: "100%" }}
							transition={springModal()}
							className="relative z-10 w-full md:w-auto md:max-w-md md:mx-4 mb-0"
						>
							<GlassPanel
								intensity="heavy"
								className="md:rounded-[var(--radius-squircle-2xl)] rounded-t-[var(--radius-squircle-2xl)] rounded-b-none md:rounded-b-[var(--radius-squircle-2xl)] bg-background/95 backdrop-blur-3xl ring-1 ring-foreground/10 shadow-2xl"
							>
								{/* Mobile drag handle */}
								<div className="md:hidden flex justify-center pt-3 pb-1">
									<div className="w-10 h-1 rounded-full bg-foreground/15" />
								</div>

								{/* ── DATES MODAL ──────────────────────────── */}
								{activeModal === "dates" && (
									<div className="flex flex-col max-h-[85dvh] md:max-h-[80vh] overflow-hidden">
										{/* Header */}
										<div className="relative px-5 pt-5 sm:px-6 sm:pt-6 pb-3 shrink-0">
											<h2 className="font-black text-foreground tracking-tight text-lg sm:text-xl pr-10">
												{t("ota.search.stay")}
											</h2>
											<p className="text-[11px] text-muted-foreground/60 mt-1 tracking-tight">
												{pendingDate?.from && pendingDate?.to
													? `${format(pendingDate.from, "dd MMM", { locale: dateLocale })} — ${format(pendingDate.to, "dd MMM", { locale: dateLocale })}`
													: pendingDate?.from
														? `${format(pendingDate.from, "dd MMM", { locale: dateLocale })} → ${t("ota.search.departure")}`
														: t("ota.search.selectDates")}
											</p>
											<motion.button
												onClick={() => setActiveModal(null)}
												whileHover={{ scale: 1.08 }}
												whileTap={{ scale: 0.9 }}
												transition={springSnappy()}
												className="absolute top-4 right-4 sm:top-5 sm:right-5 size-9 rounded-[var(--radius-squircle-lg)] flex items-center justify-center bg-muted/60 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ring-1 ring-foreground/5"
												aria-label={t("common.close")}
											>
												<X size={16} strokeWidth={2.5} />
											</motion.button>
										</div>

										{/* Calendar */}
										<div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-3">
											<div className="modal-calendar">
												<DayPicker
													mode="range"
													selected={pendingDate}
													onSelect={handleSelectDates}
													locale={dateLocale}
													numberOfMonths={1}
													disabled={{ before: today }}
													className="text-foreground font-sans"
													modifiersClassNames={{
														selected:
															"bg-brand-600 text-primary-foreground font-bold shadow-md rounded-[var(--radius-squircle-lg)]",
														range_middle:
															"bg-brand-50 text-brand-900 rounded-none",
														range_start: "rounded-l-xl rounded-r-none",
														range_end: "rounded-r-xl rounded-l-none",
													}}
												/>
											</div>
										</div>

										{/* Footer */}
										<div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-3 border-t border-foreground/5 flex items-center gap-3 shrink-0">
											<motion.button
												onClick={handleClearDates}
												whileTap={{ scale: 0.95 }}
												transition={springSnappy()}
												className="px-4 py-3 rounded-[var(--radius-squircle-xl)] text-sm font-semibold text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-colors ring-1 ring-foreground/5"
											>
												{t("ota.search.clearDates")}
											</motion.button>
											<motion.button
												onClick={handleConfirmDates}
												disabled={!pendingDate?.from || !pendingDate?.to}
												whileHover={
													pendingDate?.from && pendingDate?.to
														? { scale: 1.015 }
														: {}
												}
												whileTap={
													pendingDate?.from && pendingDate?.to
														? { scale: 0.97 }
														: {}
												}
												transition={springBounce()}
												className={cn(
													"flex-1 py-3 rounded-[var(--radius-squircle-xl)] text-sm font-bold tracking-tight transition-all ring-1",
													pendingDate?.from && pendingDate?.to
														? "bg-primary text-primary-foreground shadow-lg ring-primary/20 hover:shadow-xl"
														: "bg-muted/40 text-muted-foreground/50 ring-foreground/5 cursor-not-allowed",
												)}
											>
												{pendingDate?.from && pendingDate?.to
													? t("ota.search.confirmDates")
													: t("ota.search.selectDates")}
											</motion.button>
										</div>
									</div>
								)}

								{/* ── GUESTS MODAL ─────────────────────────── */}
								{activeModal === "guests" && (
									<div className="flex flex-col max-h-[85dvh] md:max-h-[80vh] overflow-hidden">
										{/* Header */}
										<div className="relative px-5 pt-5 sm:px-6 sm:pt-6 pb-2 shrink-0">
											<h2 className="font-black text-foreground tracking-tight text-lg sm:text-xl pr-10">
												{t("ota.search.guests")}
											</h2>
											<p className="text-xs text-muted-foreground/70 mt-0.5 tracking-tight">
												{pendingGuests}{" "}
												{t("ota.search.guest", { count: pendingGuests })}
											</p>
											<motion.button
												onClick={() => setActiveModal(null)}
												whileHover={{ scale: 1.08 }}
												whileTap={{ scale: 0.9 }}
												transition={springSnappy()}
												className="absolute top-4 right-4 sm:top-5 sm:right-5 size-9 rounded-[var(--radius-squircle-lg)] flex items-center justify-center bg-muted/60 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ring-1 ring-foreground/5"
												aria-label={t("common.close")}
											>
												<X size={16} strokeWidth={2.5} />
											</motion.button>
										</div>

										{/* Guest Selector */}
										<div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
											<GuestSelector
												value={pendingGuests}
												onChange={setPendingGuests}
												min={1}
												max={20}
											/>
										</div>

										{/* Footer */}
										<div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-3 border-t border-foreground/5 shrink-0">
											<motion.button
												onClick={handleConfirmGuests}
												whileHover={{ scale: 1.015 }}
												whileTap={{ scale: 0.97 }}
												transition={springBounce()}
												className="w-full py-3.5 rounded-[var(--radius-squircle-xl)] text-sm font-bold tracking-tight bg-primary text-primary-foreground shadow-lg ring-1 ring-primary/20 hover:shadow-xl transition-all"
											>
												{t("ota.search.confirmGuests")}
											</motion.button>
										</div>
									</div>
								)}
							</GlassPanel>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
