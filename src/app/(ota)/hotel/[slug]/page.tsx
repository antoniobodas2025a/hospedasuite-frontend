import {
	getHotelDetailsBySlugAction,
	getReviewStatsAction,
} from "@/app/actions/ota";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, Star } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomShowcaseModalWrapper } from "@/components/ota/RoomShowcaseModalWrapper";
import AvailabilitySearchBar from "@/components/ota/AvailabilitySearchBar";
import HeroGallery from "@/components/ota/HeroGallery";
import type { ImageBlurMeta } from "@/lib/image-config";
import BookingWidget from "@/components/ota/BookingWidget";
import ReviewsSection from "@/components/ota/ReviewsSection";
import HotelInfoSection from "@/components/ota/HotelInfoSection";
import RoomsListWithFilters from "@/components/ota/RoomsListWithFilters";
import HotelJsonLd from "@/components/seo/HotelJsonLd";
import ReviewSkeleton from "@/components/ota/ReviewSkeleton";
import MapSkeleton from "@/components/ota/MapSkeleton";
import { SectionHeader } from "@/components/ui/glass";
import { ErrorBoundary } from "@/components/ota/ErrorBoundary";
import LanguageSwitcher from "@/components/ota/LanguageSwitcher";
import { getTranslations } from "next-intl/server";
import { SearchContextBanner } from "@/components/ota/SearchContextBanner";

// Incremental Static Regeneration — 60s cache for inventory balance
export const revalidate = 60;
export const dynamicParams = true;

interface PageProps {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { slug } = await params;
	const t = await getTranslations("hotelDetail");
	if (!slug || slug === "null" || slug.length < 2)
		return { title: t("propertyNotFound") };

	const { success, hotel } = await getHotelDetailsBySlugAction(slug);

	if (!success || !hotel) return { title: t("propertyNotFound") };

	return {
		title:
			hotel.seo_meta_title ||
			`${hotel.name} | ${t("officialBooking")} | HospedaSuite`,
		description:
			hotel.seo_meta_description ||
			t("metaDescription", { hotelName: hotel.name, location: hotel.location }),
		openGraph: {
			images: [
				hotel.seo_og_image_url ||
					hotel.main_image_url ||
					"https://images.unsplash.com/photo-1542314831-068cd1dbfeeb",
			],
			title: hotel.seo_meta_title || `${hotel.name} | ${t("luxuryExperience")}`,
			description:
				hotel.seo_meta_description ||
				t("metaDescription", {
					hotelName: hotel.name,
					location: hotel.location,
				}),
		},
		alternates: hotel.seo_canonical_url
			? { canonical: hotel.seo_canonical_url }
			: undefined,
	};
}

export default async function ChannelHotelDetailPage({
	params,
	searchParams,
}: PageProps) {
	const { slug } = await params;
	const t = await getTranslations("hotelDetail");

	if (!slug || slug === "null" || slug.length < 2) notFound();

	const resolvedSearchParams = await searchParams;
	const checkin = resolvedSearchParams?.checkin as string | undefined;
	const checkout = resolvedSearchParams?.checkout as string | undefined;
	const guests = resolvedSearchParams?.guests as string | undefined;
	const showRoom = resolvedSearchParams?.showRoom as string | undefined;

	const { success, hotel } = await getHotelDetailsBySlugAction(
		slug,
		checkin,
		checkout,
	);

	if (!success || !hotel) notFound();

	const reviewStatsResult = await getReviewStatsAction(hotel.id);
	const reviewStats = reviewStatsResult.success ? reviewStatsResult.data : null;

	const availableRooms = (hotel.rooms || []).filter((room: any) => {
		const isActive = room.status === "active";
		const guestCount = Number(guests) || 1;
		const hasCapacity = Number(room.capacity ?? 0) >= guestCount;
		return isActive && hasCapacity;
	});

	const isSearchingDates = !!(checkin && checkout);
	const coverImage =
		hotel.main_image_url ||
		"https://images.unsplash.com/photo-1542314831-068cd1dbfeeb";

	// Build gallery with deduplication — avoid repeating the same image
	const seenUrls = new Set<string>();
	const hotelGalleryImages: { url: string; alt: string }[] = [];

	const addImage = (url: string, alt: string) => {
		if (url && !seenUrls.has(url)) {
			seenUrls.add(url);
			hotelGalleryImages.push({ url, alt });
		}
	};

	// 1. Main/hero image first
	addImage(coverImage, hotel.name);

	// 2. Cover photo (secondary)
	if (hotel.cover_photo_url && hotel.cover_photo_url !== coverImage) {
		addImage(hotel.cover_photo_url, `${hotel.name} — vista general`);
	}

	// 3. Gallery images (deduplicated)
	if (Array.isArray(hotel.gallery_urls)) {
		hotel.gallery_urls.forEach((url: string, i: number) => {
			addImage(url, `${hotel.name} — foto ${i + 1}`);
		});
	}

	// StickySubNav sections
	const navSections = [
		{ id: "rooms-section", label: t("navRooms") },
		{ id: "reviews-section", label: t("navReviews") },
		{ id: "info-section", label: t("navLocation") },
	];

	// Modal data optimization: pass minimal data when closed
	const modalHotelData = showRoom ? hotel : { slug: hotel.slug, rooms: [] };

	// Build search context for banner
	const searchContext = {
		location: (resolvedSearchParams?.location as string) || null,
		checkin: checkin || null,
		checkout: checkout || null,
		guests: guests ? Number(guests) : null,
		category: (resolvedSearchParams?.category as string) || null,
		search: (resolvedSearchParams?.search as string) || null,
	};
	const hasSearchContext = !!(
		searchContext.location ||
		searchContext.checkin ||
		searchContext.category ||
		searchContext.search
	);

	return (
		<main className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-brand-500/30">
			{/* SEO Structured Data */}
			<HotelJsonLd hotel={hotel} reviewStats={reviewStats ?? undefined} />

			{/* Room Showcase Modal — lazy data when closed */}
			<Suspense fallback={null}>
				<ErrorBoundary name="RoomShowcaseModal">
					<RoomShowcaseModalWrapper hotel={modalHotelData} />
				</ErrorBoundary>
			</Suspense>

			{/* Hero Gallery */}
			<ErrorBoundary name="HeroGallery">
				<HeroGallery
					images={hotelGalleryImages}
					hotelName={hotel.name}
					activityMessages={hotel.recent_activity_messages ?? null}
					blurs={hotel.image_blur_meta as ImageBlurMeta | undefined}
				/>
			</ErrorBoundary>

			{/* Hotel Header */}
			<div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
				<div className="flex flex-col gap-3">
					{/* Row 1: Logo + Name */}
					<div className="flex items-start gap-3 sm:gap-4">
						{hotel.logo_url ? (
							<div className="size-12 sm:size-16 md:size-20 rounded-[var(--radius-squircle-2xl)] overflow-hidden border border-border bg-card shadow-sm shrink-0 relative p-1.5 flex items-center justify-center">
								{hotel.logo_url.endsWith(".svg") ? (
									<img
										src={hotel.logo_url}
										alt={`${hotel.name} logo`}
										className="max-w-full max-h-full object-contain"
									/>
								) : (
									<Image
										src={hotel.logo_url}
										alt={`${hotel.name} logo`}
										fill
										className="object-contain"
										sizes="80px"
										quality={75}
									/>
								)}
							</div>
						) : (
							<div className="size-12 sm:size-16 md:size-20 rounded-[var(--radius-squircle-2xl)] bg-gradient-to-br from-brand-500 to-warm-600 flex items-center justify-center text-primary-foreground font-black text-xl sm:text-2xl shadow-sm shrink-0">
								{hotel.name.charAt(0).toUpperCase()}
							</div>
						)}
						<div className="min-w-0 flex-1">
							<h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight mb-1 sm:mb-2">
								{hotel.name}
							</h1>
							<div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm">
								<MapPin size={14} className="text-brand-500 shrink-0" />
								<span className="truncate">{hotel.location}</span>
							</div>
						</div>
					</div>

					{/* Row 2: Badges + Language Switcher (combined, no wrap chaos) */}
					<div className="flex items-center gap-2 ml-0 sm:ml-[72px] md:ml-[88px]">
						{reviewStats && reviewStats.total > 0 && (
							<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-muted border border-success-border text-success text-[11px] font-bold">
								<Star size={12} className="fill-success text-success" />
								{reviewStats.overall} ({reviewStats.total})
							</span>
						)}
						{hotel.category_badge && (
							<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning-muted border border-warning-border text-warning text-[11px] font-bold">
								<Star size={12} className="fill-warning" />
								{hotel.category_badge}
							</span>
						)}
						<div className="ml-auto">
							<LanguageSwitcher />
						</div>
					</div>
				</div>
			</div>

			{/* Unified Sticky Search Bar + Nav — Full Width */}
			<div className="sticky top-0 z-[var(--z-sticky)] bg-background/80 backdrop-blur-sm border-b border-border/30">
				<div className="max-w-7xl mx-auto px-4 lg:px-6 py-2">
					<AvailabilitySearchBar sticky navSections={navSections} />
				</div>
			</div>

			{/* Search Context Banner — shows when user arrives from homepage with search filters */}
			{hasSearchContext && (
				<Suspense fallback={null}>
					<SearchContextBanner context={searchContext} />
				</Suspense>
			)}

			{/* Main Content */}
			<div className="max-w-6xl mx-auto px-6 pt-8">
				{/* Two-column layout: main + sidebar */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main column */}
					<div className="lg:col-span-2 space-y-8">
						{/* Rooms List */}
						<div id="rooms-section">
							<SectionHeader
								title={t("availableRooms")}
								subtitle={
									isSearchingDates
										? t("roomsForDates", {
												available: availableRooms.length,
												total: (hotel.rooms || []).length,
											})
										: t("exploreUnits", { count: (hotel.rooms || []).length })
								}
							/>
							<div className="mt-6">
								<RoomsListWithFilters
									rooms={hotel.rooms || []}
									availableRooms={availableRooms}
									slug={slug}
									checkin={checkin ?? null}
									checkout={checkout ?? null}
									isSearchingDates={isSearchingDates}
									hotel={{
										cancellation_policy: hotel.cancellation_policy,
										tax_rate: hotel.tax_rate,
									}}
								/>
							</div>
						</div>

						{/* Reviews Section */}
						<div id="reviews-section">
							<Suspense fallback={<ReviewSkeleton />}>
								<ReviewsSection hotelId={hotel.id} hotelName={hotel.name} />
							</Suspense>
						</div>

						{/* Hotel Info Section */}
						<div id="info-section">
							<Suspense fallback={<MapSkeleton />}>
								<HotelInfoSection
									hotelName={hotel.name}
									location={hotel.location}
									address={hotel.address}
									phone={hotel.phone}
									cancellationPolicy={hotel.cancellation_policy}
									checkInTime={hotel.check_in_time}
									checkOutTime={hotel.check_out_time}
									receptionHours={hotel.reception_hours}
									latitude={hotel.latitude}
									longitude={hotel.longitude}
								/>
							</Suspense>
						</div>
					</div>

					{/* Sidebar — Booking Widget (desktop only) */}
					<aside className="hidden lg:block">
						<BookingWidget
							hotelName={hotel.name}
							rooms={hotel.rooms || []}
							checkIn={checkin ?? null}
							checkOut={checkout ?? null}
							cancellationPolicy={hotel.cancellation_policy}
							totalRooms={(hotel.rooms || []).length}
							taxRate={hotel.tax_rate}
						/>
					</aside>
				</div>
			</div>

		</main>
	);
}
