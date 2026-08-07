"use client";

import React, { useState, useCallback, useMemo, Suspense } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryItem } from "@/types";
import { cn } from "@/lib/utils";
import GalleryImage from "@/components/ota/shared/GalleryImage";
import { DynamicGalleryLightbox as GalleryLightbox } from "@/components/ota/shared/DynamicGalleryLightbox";
import { SkeletonImage } from "@/components/ota/SkeletonImage";
import { springGentle } from "@/lib/mac2026/spring";

// ============================================================================
// ROOM GALLERY GRID — Airbnb-style asymmetric layout
// Shared element transitions via Framer Motion layoutId
// Skeleton shimmer while images load
// ============================================================================

interface RoomGalleryGridProps {
	images: GalleryItem[];
	roomName: string;
	blurDataURL?: string;
	/** roomId drives the shared element layoutId from RoomCard */
	roomId?: string;
	/** Layout variant drives LCP/image sizing strategy */
	layout?: "hotel-page" | "detail-page";
}

export default function RoomGalleryGrid({
	images,
	roomName,
	blurDataURL,
	roomId,
	layout = "hotel-page",
}: RoomGalleryGridProps) {
	const t = useTranslations();
	const activeRoomId = roomId;
	const [open, setOpen] = useState(false);
	const [index, setIndex] = useState(0);
	const [loadedSet, setLoadedSet] = useState<Set<number>>(new Set());

	const slides = useMemo(
		() =>
			images.map((img, i) => ({
				src: img.url,
				alt: img.alt ?? roomName,
				description: img.caption,
				blurDataURL: img.blurDataURL || (i === 0 ? blurDataURL : undefined),
				msrc: img.blurDataURL || img.url,
			})),
		[images, roomName, blurDataURL],
	);

	const handleOpen = useCallback((i: number) => {
		setIndex(i);
		setOpen(true);
	}, []);

	const handleClose = useCallback(() => setOpen(false), []);

	const markLoaded = useCallback((i: number) => {
		setLoadedSet((prev) => {
			if (prev.has(i)) return prev;
			const next = new Set(prev);
			next.add(i);
			return next;
		});
	}, []);

	// Shared element layoutId for the hero image (matches RoomCard)
	const heroLayoutId = activeRoomId ? `room-image-${activeRoomId}` : undefined;
	const heroTransition = { type: "spring" as const, stiffness: 300, damping: 30 };

	// Staggered fade-in animation for desktop grid items
	const containerVariants = {
		hidden: {},
		visible: { transition: { staggerChildren: 0.06 } },
	};
	const itemVariants = {
		hidden: { opacity: 0, y: 12 },
		visible: { opacity: 1, y: 0, transition: springGentle() },
	};

	// 0–1 images: show a "View photos" placeholder instead of an empty grid
	if (images.length === 0) {
		return (
			<div className="relative w-full">
				<div className="grid grid-cols-2 gap-2 rounded-[1.5rem] overflow-hidden">
					<SkeletonImage className="col-span-2 aspect-[4/3]" />
					<SkeletonImage className="aspect-[4/3]" />
					<SkeletonImage className="aspect-[4/3]" />
				</div>
			</div>
		);
	}

	// Single image
	if (images.length === 1) {
		return (
			<div className="relative w-full">
				<MobileCarousel
					images={images}
					roomName={roomName}
					blurDataURL={blurDataURL}
					activeIndex={0}
					setIndex={setIndex}
					onOpen={handleOpen}
				/>
				<motion.div
					className="hidden lg:block relative w-full aspect-[4/3] rounded-[1.5rem] overflow-hidden group cursor-pointer"
					onClick={() => handleOpen(0)}
					variants={itemVariants}
					initial="hidden"
					animate="visible"
				>
					{!loadedSet.has(0) && <SkeletonImage className="absolute inset-0 z-10" />}
					<motion.div
						{...(heroLayoutId ? { layoutId: heroLayoutId } : {})}
						transition={heroTransition}
						className="absolute inset-0"
					>
						<GalleryImage
							src={images[0].url}
							alt={images[0].alt ?? roomName}
							fill
							className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out group-hover:motion-safe:scale-105"
							preload
							sizes="100vw"
							quality={85}
							placeholder={images[0].blurDataURL || blurDataURL ? "blur" : undefined}
							blurDataURL={images[0].blurDataURL || blurDataURL}
							onLoad={() => markLoaded(0)}
						/>
					</motion.div>
					<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

					<div className="absolute bottom-3 right-3">
						<span className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-pill text-white text-xs font-semibold shadow-lg">
							<CameraIcon />
							{images.length}
						</span>
					</div>
				</motion.div>
			</div>
		);
	}

	// 2–5 images: simple grid
	if (images.length <= 5) {
		return (
			<div className="relative w-full">
				<MobileCarousel
					images={images}
					roomName={roomName}
					blurDataURL={blurDataURL}
					activeIndex={index}
					setIndex={setIndex}
					onOpen={handleOpen}
				/>
				<div className="hidden lg:block">
				<motion.div
					className="grid grid-cols-2 gap-2 rounded-[1.5rem] overflow-hidden"
					variants={containerVariants}
					initial="hidden"
					animate="visible"
				>
					{/* Hero image */}
					<motion.button
						type="button"
						onClick={() => handleOpen(0)}
						className="relative aspect-[4/3] col-span-2 group cursor-pointer"
						aria-label={t("ota.roomGallery.viewImage", { index: 1 })}
						variants={itemVariants}
					>
						{!loadedSet.has(0) && <SkeletonImage className="absolute inset-0 z-10" />}
						<motion.div
							{...(heroLayoutId ? { layoutId: heroLayoutId } : {})}
							transition={heroTransition}
							className="absolute inset-0"
						>
						<GalleryImage
							src={images[0].url}
							alt={images[0].alt ?? roomName}
							fill
							className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out group-hover:motion-safe:scale-105"
							preload
							sizes="100vw"
							quality={85}
							placeholder={images[0].blurDataURL || blurDataURL ? "blur" : undefined}
							blurDataURL={images[0].blurDataURL || blurDataURL}
							onLoad={() => markLoaded(0)}
						/>
						</motion.div>
						<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
					</motion.button>

					{/* Remaining images */}
					{images.slice(1).map((img, i) => (
						<motion.button
							key={i + 1}
							type="button"
							onClick={() => handleOpen(i + 1)}
							className="relative aspect-[4/3] group cursor-pointer"
							aria-label={t("ota.roomGallery.viewImage", { index: i + 2 })}
							variants={itemVariants}
						>
							{!loadedSet.has(i + 1) && <SkeletonImage className="absolute inset-0 z-10" />}
							<GalleryImage
								src={img.url}
								alt={img.alt ?? `${roomName} — ${i + 2}`}
								fill
								className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out group-hover:motion-safe:scale-105"
								sizes={layout === "detail-page" ? "(max-width: 1024px) 100vw, 27vw" : "50vw"}
								quality={75}
								loading="lazy"
								fetchPriority={layout === "detail-page" && i < 3 ? "high" : undefined}
								placeholder={img.blurDataURL ? "blur" : undefined}
								blurDataURL={img.blurDataURL}
								onLoad={() => markLoaded(i + 1)}
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
						</motion.button>
					))}
				</motion.div>

				{images.length > 4 && (
					<button
						type="button"
						onClick={() => handleOpen(0)}
						className="absolute bottom-3 right-3 px-4 py-2 glass-pill text-white text-xs font-semibold shadow-lg hover:scale-105 motion-safe:transition-transform"
						aria-label={t("ota.roomGallery.viewAllPhotos")}
					>
						{t("ota.roomGallery.viewAllPhotos")}
					</button>
				)}

				<div className="absolute top-3 right-3">
					<span className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-pill text-white text-xs font-semibold shadow-lg">
						<CameraIcon />
						{images.length}
					</span>
				</div>

				<Suspense fallback={null}>
					<GalleryLightbox
						slides={slides}
						open={open}
						openIndex={index}
						onClose={handleClose}
						zoom={{ maxZoomLevel: 3 }}
					/>
				</Suspense>
				</div>
			</div>
		);
	}

	// 6+ images: Airbnb asymmetric grid
	return (
		<div className="relative w-full">
			<MobileCarousel
				images={images}
				roomName={roomName}
				blurDataURL={blurDataURL}
				activeIndex={index}
				setIndex={setIndex}
				onOpen={handleOpen}
			/>
			<div className="hidden lg:block">
			<motion.div
				className="grid grid-cols-4 grid-rows-2 gap-2 rounded-[1.5rem] overflow-hidden h-[400px]"
				variants={containerVariants}
				initial="hidden"
				animate="visible"
			>
				{/* Hero — left half, full height */}
				<motion.button
					type="button"
					onClick={() => handleOpen(0)}
					className="relative col-span-2 row-span-2 group cursor-pointer"
					aria-label={t("ota.roomGallery.viewImage", { index: 1 })}
					variants={itemVariants}
				>
					{!loadedSet.has(0) && <SkeletonImage className="absolute inset-0 z-10" />}
					<motion.div
						{...(heroLayoutId ? { layoutId: heroLayoutId } : {})}
						transition={heroTransition}
						className="absolute inset-0"
					>
					<GalleryImage
						src={images[0].url}
						alt={images[0].alt ?? roomName}
						fill
						className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out group-hover:motion-safe:scale-105"
						preload
						sizes={layout === "detail-page" ? "(max-width: 1024px) 100vw, 55vw" : "50vw"}
						quality={85}
						placeholder={images[0].blurDataURL || blurDataURL ? "blur" : undefined}
						blurDataURL={images[0].blurDataURL || blurDataURL}
						onLoad={() => markLoaded(0)}
					/>
					</motion.div>
					<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
				</motion.button>

				{/* 4 small images (2×2) */}
				{images.slice(1, 5).map((img, i) => (
					<motion.button
						key={i + 1}
						type="button"
						onClick={() => handleOpen(i + 1)}
						className="relative group cursor-pointer"
						aria-label={t("ota.roomGallery.viewImage", { index: i + 2 })}
						variants={itemVariants}
					>
						{!loadedSet.has(i + 1) && <SkeletonImage className="absolute inset-0 z-10" />}
						<GalleryImage
							src={img.url}
							alt={img.alt ?? `${roomName} — ${i + 2}`}
							fill
							className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out group-hover:motion-safe:scale-105"
							sizes={layout === "detail-page" ? "(max-width: 1024px) 100vw, 27vw" : "25vw"}
							quality={75}
							loading="lazy"
							fetchPriority={layout === "detail-page" && i < 3 ? "high" : undefined}
							placeholder={img.blurDataURL ? "blur" : undefined}
							blurDataURL={img.blurDataURL}
							onLoad={() => markLoaded(i + 1)}
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
					</motion.button>
				))}
			</motion.div>

			<button
				type="button"
				onClick={() => handleOpen(0)}
				className="absolute bottom-3 right-3 px-4 py-2 glass-pill text-white text-xs font-semibold shadow-lg hover:scale-105 motion-safe:transition-transform"
				aria-label={t("ota.roomGallery.viewAllPhotos")}
			>
				{t("ota.roomGallery.viewAllPhotos")}
			</button>

			<div className="absolute top-3 right-3">
				<span className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-pill text-white text-xs font-semibold shadow-lg">
					<CameraIcon />
					{images.length}
				</span>
			</div>

			<Suspense fallback={null}>
				<GalleryLightbox
					slides={slides}
					open={open}
					openIndex={index}
					onClose={handleClose}
					zoom={{ maxZoomLevel: 3 }}
				/>
			</Suspense>
			</div>
		</div>
	);
}

// ============================================================================
// MOBILE CAROUSEL — horizontal swipe with counter + dots
// ============================================================================
function MobileCarousel({
	images,
	roomName,
	blurDataURL,
	activeIndex,
	setIndex,
	onOpen,
}: {
	images: GalleryItem[];
	roomName: string;
	blurDataURL?: string;
	activeIndex: number;
	setIndex: (i: number) => void;
	onOpen: (i: number) => void;
}) {
	const t = useTranslations();
	const [touchStart, setTouchStart] = useState<number | null>(null);
	const [touchEnd, setTouchEnd] = useState<number | null>(null);

	const minSwipeDistance = 50;

	const onTouchStart = useCallback((e: React.TouchEvent) => {
		setTouchEnd(null);
		setTouchStart(e.touches[0]?.clientX ?? 0);
	}, []);

	const onTouchMove = useCallback((e: React.TouchEvent) => {
		setTouchEnd(e.touches[0]?.clientX ?? 0);
	}, []);

	const onTouchEnd = useCallback(() => {
		if (touchStart === null || touchEnd === null) return;
		const distance = touchStart - touchEnd;
		const isLeftSwipe = distance > minSwipeDistance;
		const isRightSwipe = distance < -minSwipeDistance;
		if (isLeftSwipe) {
			setIndex(Math.min(images.length - 1, activeIndex + 1));
		} else if (isRightSwipe) {
			setIndex(Math.max(0, activeIndex - 1));
		}
	}, [touchStart, touchEnd, activeIndex, images.length, setIndex]);

	return (
		<div className="relative w-full lg:hidden">
			<div
				data-testid="mobile-carousel"
				className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-foreground"
				onTouchStart={onTouchStart}
				onTouchMove={onTouchMove}
				onTouchEnd={onTouchEnd}
			>
				<div
					className="flex h-full transition-transform duration-300 ease-out"
					style={{ transform: `translateX(-${activeIndex * 100}%)` }}
				>
					{images.map((img, i) => (
						<button
							key={i}
							type="button"
							className="relative w-full h-full flex-shrink-0 cursor-pointer"
							onClick={() => onOpen(i)}
							aria-label={t("ota.roomGallery.viewImage", { index: i + 1 })}
						>
							<GalleryImage
								src={img.url}
								alt={img.alt ?? `${roomName} — ${i + 1}`}
								fill
								className="object-cover"
								preload={i === 0}
								loading={i === 0 ? "eager" : "lazy"}
								sizes="100vw"
								quality={85}
								placeholder={img.blurDataURL ? "blur" : undefined}
								blurDataURL={img.blurDataURL || blurDataURL}
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
						</button>
					))}
				</div>
			</div>

			{/* Navigation arrows */}
			{images.length > 1 && (
				<>
					<button
						type="button"
						data-testid="carousel-prev"
						onClick={() => setIndex(Math.max(0, activeIndex - 1))}
						disabled={activeIndex === 0}
						className="absolute left-2 top-1/2 -translate-y-1/2 z-10 size-9 rounded-full glass-pill text-white flex items-center justify-center shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
						aria-label={t("ota.roomGallery.prevImage")}
					>
						<ChevronLeft size={20} />
					</button>
					<button
						type="button"
						data-testid="carousel-next"
						onClick={() => setIndex(Math.min(images.length - 1, activeIndex + 1))}
						disabled={activeIndex === images.length - 1}
						className="absolute right-2 top-1/2 -translate-y-1/2 z-10 size-9 rounded-full glass-pill text-white flex items-center justify-center shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
						aria-label={t("ota.roomGallery.nextImage")}
					>
						<ChevronRight size={20} />
					</button>
				</>
			)}

			{/* Dots indicator */}
			{images.length > 1 && (
				<div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
					{images.map((_, i) => (
						<button
							key={i}
							type="button"
							data-testid="carousel-dot"
							onClick={() => setIndex(i)}
							className={cn(
								"w-2 h-2 rounded-full transition-all",
								i === activeIndex
									? "bg-white w-4"
									: "bg-white/50 hover:bg-white/80"
							)}
							aria-label={t("ota.roomGallery.goToImage", { index: i + 1 })}
							aria-current={i === activeIndex ? "true" : "false"}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// Inline SVG avoids an extra icon import for a decorative element
function CameraIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="size-3.5"
			aria-hidden="true"
		>
			<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
			<circle cx="9" cy="9" r="2" />
			<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
		</svg>
	);
}
