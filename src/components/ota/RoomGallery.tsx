"use client";

import React, { useState, useCallback, useMemo, Suspense } from "react";
import { useTranslations } from "next-intl";
import type { GalleryItem } from "@/types";
import GalleryImage from "@/components/ota/shared/GalleryImage";
import { DynamicGalleryLightbox as GalleryLightbox } from "@/components/ota/shared/DynamicGalleryLightbox";

// ============================================================================
// ROOM GALLERY — Simplified (no drag & drop, no thumbnails)
// ============================================================================

interface RoomGalleryProps {
	images: GalleryItem[];
	roomName: string;
	variant?: "inline" | "compact";
	/** Optional blur placeholder for the main/hero image */
	blurDataURL?: string;
}

export default function RoomGallery({
	images,
	roomName,
	variant = "inline",
	blurDataURL,
}: RoomGalleryProps) {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const [index, setIndex] = useState(0);

	const slides = useMemo(
		() =>
			images.map((img, i) => ({
				src: img.url,
				alt: img.alt ?? roomName,
				description: img.caption,
				blurDataURL: img.blurDataURL || (i === 0 ? blurDataURL : undefined),
			})),
		[images, roomName, blurDataURL],
	);

	const handleOpen = useCallback((i: number) => {
		setIndex(i);
		setOpen(true);
	}, []);

	const handleClose = useCallback(() => setOpen(false), []);

	// --------------------------------------------------------------------------
	// MODO INLINE: carrusel CSS nativo con scroll-snap
	// --------------------------------------------------------------------------
	if (variant === "inline") {
		return (
			<div className="relative w-full h-full group">
				{/* Carrusel con scroll-snap nativo */}
				<div className="flex overflow-x-auto snap-x snap-mandatory w-full h-full scrollbar-hide"
					style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
				>
					{images.map((img, i) => (
						<button
							key={i}
							type="button"
							onClick={() => handleOpen(i)}
							className="flex-none w-full h-full snap-center relative cursor-pointer group/slide"
							aria-label={t("ota.roomGallery.viewImage", { index: i + 1 })}
						>
							<GalleryImage
								src={img.url}
								alt={img.alt ?? `${roomName} — ${i + 1}`}
								fill
								className="object-contain"
								sizes="100vw"
								quality={90}
								preload={i === 0}
								loading={i === 0 ? "eager" : "lazy"}
								placeholder={img.blurDataURL ? "blur" : undefined}
								blurDataURL={img.blurDataURL}
							/>
							<div className="absolute inset-0 bg-foreground/0 group-hover/slide:bg-foreground/[0.03] transition-colors" />
						</button>
					))}
				</div>

				{/* Contador de fotos — bottom right */}
				{images.length > 1 && (
					<div className="absolute bottom-4 right-4 z-10">
						<span className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-pill text-white text-xs font-semibold shadow-lg">
							{index + 1} / {images.length}
						</span>
					</div>
				)}

				{/* Lightbox fullscreen */}
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

	// --------------------------------------------------------------------------
	// MODO COMPACTO: imagen principal con contador (sin thumbnails)
	// --------------------------------------------------------------------------
	return (
		<div>
			{/* Imagen principal */}
			<button
				type="button"
				onClick={() => handleOpen(0)}
				className="relative block aspect-[4/3] sm:aspect-[16/10] w-full rounded-[1.5rem] overflow-hidden shadow-lg shadow-elev-2 group cursor-pointer"
				aria-label={t("ota.roomGallery.viewGallery", { name: roomName })}
			>
				<GalleryImage
					src={images[0]?.url ?? ""}
					alt={images[0]?.alt ?? roomName}
					fill
					className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out group-hover:motion-safe:scale-105"
					preload
					sizes="100vw"
					quality={85}
					placeholder={images[0]?.blurDataURL || blurDataURL ? "blur" : undefined}
					blurDataURL={images[0]?.blurDataURL || blurDataURL}
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

				{/* Contador de fotos — bottom right */}
				{images.length > 1 && (
					<div className="absolute bottom-3 right-3">
						<span className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-pill text-white text-xs font-semibold shadow-lg">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="size-3.5"
							>
								<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
								<circle cx="9" cy="9" r="2" />
								<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
							</svg>
							{images.length}
						</span>
					</div>
				)}
			</button>

			{/* Lightbox */}
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
