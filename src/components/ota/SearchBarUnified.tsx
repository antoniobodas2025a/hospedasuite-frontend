"use client";

import {
	useState,
	useRef,
	useEffect,
	useTransition,
	useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
	Calendar as CalendarIcon,
	X,
	User,
	MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker, DateRange } from "react-day-picker";
import { format, parseISO, isValid, startOfDay, addDays, addWeeks, addMonths, nextSaturday, nextSunday } from "date-fns";
import { cn } from "@/lib/utils";
import {
	springSnappy,
	springBounce,
	springGentle,
} from "@/lib/mac2026/spring";
import "react-day-picker/dist/style.css";

import { useTranslations, useLocale } from "next-intl";
import { getDateFnsLocale } from "@/lib/date-locale";

// Code splitting: LocationAutocomplete no es crítico para el render inicial
const LocationAutocomplete = dynamic(
  () => import("@/components/ota/LocationAutocomplete"),
  {
    ssr: false,
    loading: () => <div className="h-10 bg-muted/30 rounded animate-pulse" />,
  }
);

// Code splitting: GuestSelector no es crítico para el render inicial
const GuestSelector = dynamic(
  () => import("@/components/ota/GuestSelector"),
  {
    ssr: false,
    loading: () => <div className="h-10 bg-muted/30 rounded animate-pulse" />,
  }
);

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
	const datesZoneRef = useRef<HTMLDivElement>(null);
	const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const [, startTransition] = useTransition();
	const [activeModal, setActiveModal] = useState<"dates" | "guests" | null>(
		null,
	);

	// State: location — independent state, only synced FROM URL on mount
	// Do NOT sync from URL on every searchParams change (causes stale closure bugs)
	const [location, setLocation] = useState(searchParams.get("location") || "");

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
		return g ? Number(g) : 2;
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

	// URL sync — merge-only: never deletes params that aren't explicitly overridden
	const pushUrl = useCallback(
		(overrides?: {
			checkin?: Date | null;
			checkout?: Date | null;
			guests?: number | null;
			location?: string | null;
		}) => {
			const p = new URLSearchParams(searchParams.toString());
			const { checkin, checkout, guests: g, location: loc } = overrides || {};

			// Dates: only modify when explicitly passed (null = clear, Date = set)
			if (checkin !== undefined) {
				if (checkin === null) { p.delete("checkin"); p.delete("checkout"); }
				else if (checkout) {
					p.set("checkin", format(checkin, "yyyy-MM-dd"));
					p.set("checkout", format(checkout, "yyyy-MM-dd"));
				}
			}

			// Guests: only modify when explicitly passed
			if (g !== undefined) {
				if (g === null || g <= 0) p.delete("guests");
				else p.set("guests", g.toString());
			}

			// Location: preserve from state if not explicitly passed (handles debounce race)
			if (loc !== undefined) {
				if (loc === null || loc === "") p.delete("location");
				else p.set("location", loc);
			} else if (locationRef.current && !p.has("location")) {
				p.set("location", locationRef.current);
			}

			const query = p.toString();
			const url = query ? `${pathname}?${query}` : pathname;
			startTransition(() => router.push(url, { scroll: false }));
		},
		[searchParams, pathname, router],
	);

	// Ref to always access the latest pushUrl inside debounced callbacks
	// (prevents stale closure race when location debounce + date selection overlap)
	const pushUrlRef = useRef(pushUrl);
	useEffect(() => {
		pushUrlRef.current = pushUrl;
	}, [pushUrl]);

	// Ref for latest location — used by pushUrl to preserve location state
	// even when the debounce hasn't synced it to URL yet
	const locationRef = useRef(location);
	// eslint-disable-next-line react-hooks/immutability -- refs are mutable by design, this is a latest-value pattern
	locationRef.current = location;

	// Handlers: Dates — auto-confirm on complete range selection
	const handleSelectDates = (newDate: DateRange | undefined) => {
		if (newDate?.from && newDate?.to) {
			if (newDate.from.getTime() === newDate.to.getTime()) {
				setPendingDate({ from: newDate.from, to: undefined });
				return;
			}
			// Auto-confirm: apply dates and close modal immediately
			setDate({ from: newDate.from, to: newDate.to });
			setPendingDate({ from: newDate.from, to: newDate.to });
			setActiveModal(null);
			pushUrl({ checkin: newDate.from, checkout: newDate.to, location: location || undefined });
			onSearch?.({
				location,
				checkin: format(newDate.from, "yyyy-MM-dd"),
				checkout: format(newDate.to, "yyyy-MM-dd"),
				guests,
			});
		} else {
			setPendingDate(newDate);
		}
	};

	const handleConfirmDates = () => {
		if (pendingDate?.from && pendingDate?.to) {
			setDate(pendingDate);
			setActiveModal(null);
			pushUrl({ checkin: pendingDate.from, checkout: pendingDate.to, location: location || undefined });
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
		pushUrl({ checkin: null, checkout: null, location: location || undefined });
		onSearch?.({ location, checkin: null, checkout: null, guests });
	};

	// Handlers: Guests
	const handleConfirmGuests = () => {
		setGuests(pendingGuests);
		setActiveModal(null);
		pushUrl({ guests: pendingGuests, location: location || undefined });
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
			pushUrlRef.current({ location: val });
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
		return t("ota.search.suggestedWeekend");
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
					ref={datesZoneRef}
					onClick={() =>
						setActiveModal(activeModal === "dates" ? null : "dates")
					}
					role="button"
					aria-expanded={activeModal === "dates"}
					aria-label={t("ota.search.selectDates")}
					className={cn(
						"flex-1 flex items-center gap-2 px-3 py-2 sm:py-3 bg-card border border-border/50 sm:border-x-0 hover:border-border transition-colors cursor-pointer",
						activeModal === "dates" && "ring-2 ring-brand-500/30",
					)}
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

			{/* ── DATES POPOVER ────────────────────────────────────────── */}
			<AnimatePresence>
				{activeModal === "dates" && (
					<motion.div
						initial={{ opacity: 0, scaleY: 0.92, y: -6 }}
						animate={{ opacity: 1, scaleY: 1, y: 0 }}
						exit={{ opacity: 0, scaleY: 0.92, y: -6 }}
						transition={springGentle()}
						style={{ originY: 0 }}
						className="absolute top-full left-0 right-0 mt-2 z-50 max-w-md bg-background/95 backdrop-blur-xl ring-1 ring-foreground/10 rounded-[var(--radius-squircle-2xl)] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12),0_24px_48px_-12px_rgba(0,0,0,0.18)] overflow-hidden"
					>
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

						{/* Quick date presets */}
						<div className="flex flex-wrap gap-2 px-3 sm:px-4 pt-3">
							{[
								{ label: t("ota.search.thisWeekend"), getDates: () => ({ from: nextSaturday(today), to: nextSunday(nextSaturday(today)) }) },
								{ label: t("ota.search.nextWeek"), getDates: () => ({ from: addWeeks(today, 1), to: addDays(addWeeks(today, 1), 3) }) },
								{ label: t("ota.search.nextMonth"), getDates: () => ({ from: addMonths(today, 1), to: addDays(addMonths(today, 1), 3) }) },
							].map((preset) => (
								<button
									key={preset.label}
									type="button"
									onClick={() => {
										const dates = preset.getDates();
										handleSelectDates(dates);
									}}
									className="px-3 py-1.5 text-xs font-semibold rounded-full border border-border bg-card hover:bg-muted transition-colors"
								>
									{preset.label}
								</button>
							))}
						</div>

						{/* Calendar */}
						<div className="px-3 sm:px-4 pb-3">
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
										range_start: "bg-brand-600 text-primary-foreground rounded-l-xl rounded-r-none",
										range_end: "bg-brand-600 text-primary-foreground rounded-r-xl rounded-l-none",
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
					</motion.div>
				)}
			</AnimatePresence>

			{/* ═══════════════════════════════════════════════════════════ */}
			{/* GUESTS MODAL — rendered via portal to avoid parent transform breaking fixed positioning */}
			{/* ═══════════════════════════════════════════════════════════ */}
			{typeof document !== "undefined" &&
				activeModal === "guests" &&
				createPortal(
					<AnimatePresence>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.15 }}
							className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
						>
							{/* Backdrop overlay */}
							<div
								className="absolute inset-0 bg-black/20 backdrop-blur-sm"
								onClick={() => setActiveModal(null)}
								aria-hidden="true"
							/>

							{/* Modal container */}
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={{
									type: "spring",
									stiffness: 180,
									damping: 22,
									mass: 1.4,
									restDelta: 0.001,
									restSpeed: 0.01,
								}}
								className="relative z-10 w-full max-w-md h-[85dvh] md:h-[80vh]"
							>
								<div className="glass-panel rounded-[var(--radius-squircle-2xl)] bg-background/95 backdrop-blur-3xl ring-1 ring-foreground/10 shadow-2xl h-full flex flex-col overflow-hidden">
									{/* ── GUESTS MODAL ─────────────────────────── */}
									{activeModal === "guests" && (
										<div className="flex flex-col h-full overflow-hidden">
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
													onClick={handleConfirmGuests}
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
											<div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 min-h-0">
												<GuestSelector
													value={pendingGuests}
													onChange={setPendingGuests}
													min={1}
													max={20}
												/>
											</div>
										</div>
									)}
								</div>
							</motion.div>
						</motion.div>
					</AnimatePresence>,
					document.body,
				)}
		</div>
	);
}
