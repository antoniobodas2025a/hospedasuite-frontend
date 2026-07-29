"use client";

import React, { useState, useCallback, useMemo, Suspense } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { GalleryItem } from "@/types";
import GalleryImage from "@/components/ota/shared/GalleryImage";
import { DynamicGalleryLightbox as GalleryLightbox } from "@/components/ota/shared/DynamicGalleryLightbox";
import { SkeletonImage } from "@/components/ota/SkeletonImage";
import { useSearchParams } from "next/navigation";

// ============================================================================
// ROOM GALLERY GRID — Airbnb-style asymmetric layout
// Shared element transitions via Framer Motion layoutId
// Skeleton shimmer while images load
// ============================================================================

interface RoomGalleryGridProps {
	images: GalleryItem[];
	roomName: string;
	blurDataURL?: string;
	/** Override roomId for layoutId (falls back to ?showRoom param) */
	roomId?: string;
}

export default function RoomGalleryGrid({
	images,
	roomName,
	blurDataURL,
	roomId,
}: RoomGalleryGridProps) {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const activeRoomId = roomId ?? searchParams.get("showRoom");
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

	// Empty state — skeleton grid while data loads
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
			<div
				className="relative w-full aspect-[4/3] rounded-[1.5rem] overflow-hidden group cursor-pointer"
				onClick={() => handleOpen(0)}
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
						priority
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
			</div>
		);
	}

	// 2–5 images: simple grid
	if (images.length <= 5) {
		return (
			<div className="relative w-full">
				<div className="grid grid-cols-2 gap-2 rounded-[1.5rem] overflow-hidden">
					{/* Hero image */}
					<button
						type="button"
						onClick={() => handleOpen(0)}
						className="relative aspect-[4/3] col-span-2 group cursor-pointer"
						aria-label={t("ota.roomGallery.viewImage", { index: 1 })}
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
								priority
								sizes="100vw"
								quality={85}
								placeholder={images[0].blurDataURL || blurDataURL ? "blur" : undefined}
								blurDataURL={images[0].blurDataURL || blurDataURL}
								onLoad={() => markLoaded(0)}
							/>
						</motion.div>
						<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
					</button>

					{/* Remaining images */}
					{images.slice(1).map((img, i) => (
						<button
							key={i + 1}
							type="button"
							onClick={() => handleOpen(i + 1)}
							className="relative aspect-[4/3] group cursor-pointer"
							aria-label={t("ota.roomGallery.viewImage", { index: i + 2 })}
						>
							{!loadedSet.has(i + 1) && <SkeletonImage className="absolute inset-0 z-10" />}
							<GalleryImage
								src={img.url}
								alt={img.alt ?? `${roomName} — ${i + 2}`}
								fill
								className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out group-hover:motion-safe:scale-105"
								sizes="50vw"
								quality={75}
								loading="lazy"
								placeholder={img.blurDataURL ? "blur" : undefined}
								blurDataURL={img.blurDataURL}
								onLoad={() => markLoaded(i + 1)}
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
						</button>
					))}
				</div>

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
		);
	}

	// 6+ images: Airbnb asymmetric grid
	return (
		<div className="relative w-full">
			<div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-[1.5rem] overflow-hidden h-[400px]">
				{/* Hero — left half, full height */}
				<button
					type="button"
					onClick={() => handleOpen(0)}
					className="relative col-span-2 row-span-2 group cursor-pointer"
					aria-label={t("ota.roomGallery.viewImage", { index: 1 })}
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
							priority
							sizes="50vw"
							quality={85}
							placeholder={images[0].blurDataURL || blurDataURL ? "blur" : undefined}
							blurDataURL={images[0].blurDataURL || blurDataURL}
							onLoad={() => markLoaded(0)}
						/>
					</motion.div>
					<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
				</button>

				{/* 4 small images (2×2) */}
				{images.slice(1, 5).map((img, i) => (
					<button
						key={i + 1}
						type="button"
						onClick={() => handleOpen(i + 1)}
						className="relative group cursor-pointer"
						aria-label={t("ota.roomGallery.viewImage", { index: i + 2 })}
					>
						{!loadedSet.has(i + 1) && <SkeletonImage className="absolute inset-0 z-10" />}
						<GalleryImage
							src={img.url}
							alt={img.alt ?? `${roomName} — ${i + 2}`}
							fill
							className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out group-hover:motion-safe:scale-105"
							sizes="25vw"
							quality={75}
							loading="lazy"
							placeholder={img.blurDataURL ? "blur" : undefined}
							blurDataURL={img.blurDataURL}
							onLoad={() => markLoaded(i + 1)}
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
					</button>
				))}
			</div>

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
