"use client";

import React, { useState, useCallback, useMemo, Suspense } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import type { GalleryItem } from "@/types";
import GalleryImage from "@/components/ota/shared/GalleryImage";
import { DynamicGalleryLightbox as GalleryLightbox } from "@/components/ota/shared/DynamicGalleryLightbox";

// ============================================================================
// ROOM GALLERY GRID — Airbnb-style asymmetric layout
// ============================================================================

interface RoomGalleryGridProps {
	images: GalleryItem[];
	roomName: string;
	blurDataURL?: string;
}

export default function RoomGalleryGrid({
	images,
	roomName,
	blurDataURL,
}: RoomGalleryGridProps) {
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

	// Si hay 1 sola imagen, mostrar solo esa
	if (images.length === 1) {
		return (
			<div className="relative w-full aspect-[4/3] rounded-[1.5rem] overflow-hidden group cursor-pointer"
				onClick={() => handleOpen(0)}
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
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
				
				{/* Contador */}
				<div className="absolute bottom-3 right-3">
					<span className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-pill text-white text-xs font-semibold shadow-lg">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
							<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
							<circle cx="9" cy="9" r="2" />
							<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
						</svg>
						{images.length}
					</span>
				</div>
			</div>
		);
	}

	// Si hay 2-5 imágenes, mostrar grid simple
	if (images.length <= 5) {
		return (
			<div className="relative w-full">
				<div className="grid grid-cols-2 gap-2 rounded-[1.5rem] overflow-hidden">
					{/* Primera imagen grande */}
					<button
						type="button"
						onClick={() => handleOpen(0)}
						className="relative aspect-[4/3] col-span-2 group cursor-pointer"
						aria-label={t("ota.roomGallery.viewImage", { index: 1 })}
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
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
					</button>

					{/* Resto de imágenes */}
					{images.slice(1).map((img, i) => (
						<button
							key={i + 1}
							type="button"
							onClick={() => handleOpen(i + 1)}
							className="relative aspect-[4/3] group cursor-pointer"
							aria-label={t("ota.roomGallery.viewImage", { index: i + 2 })}
						>
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
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
						</button>
					))}
				</div>

				{/* Botón "Ver todas las fotos" */}
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

				{/* Contador */}
				<div className="absolute top-3 right-3">
					<span className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-pill text-white text-xs font-semibold shadow-lg">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
							<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
							<circle cx="9" cy="9" r="2" />
							<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
						</svg>
						{images.length}
					</span>
				</div>

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

	// 6+ imágenes: Grid asimétrico tipo Airbnb
	return (
		<div className="relative w-full">
			<div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-[1.5rem] overflow-hidden h-[400px]">
				{/* Imagen principal (50% del ancho, 100% del alto) */}
				<button
					type="button"
					onClick={() => handleOpen(0)}
					className="relative col-span-2 row-span-2 group cursor-pointer"
					aria-label={t("ota.roomGallery.viewImage", { index: 1 })}
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
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
				</button>

				{/* 4 imágenes pequeñas (2x2) */}
				{images.slice(1, 5).map((img, i) => (
					<button
						key={i + 1}
						type="button"
						onClick={() => handleOpen(i + 1)}
						className="relative group cursor-pointer"
						aria-label={t("ota.roomGallery.viewImage", { index: i + 2 })}
					>
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
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
					</button>
				))}
			</div>

			{/* Botón "Ver todas las fotos" */}
			<button
				type="button"
				onClick={() => handleOpen(0)}
				className="absolute bottom-3 right-3 px-4 py-2 glass-pill text-white text-xs font-semibold shadow-lg hover:scale-105 motion-safe:transition-transform"
				aria-label={t("ota.roomGallery.viewAllPhotos")}
			>
				{t("ota.roomGallery.viewAllPhotos")}
			</button>

			{/* Contador */}
			<div className="absolute top-3 right-3">
				<span className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-pill text-white text-xs font-semibold shadow-lg">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
						<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
						<circle cx="9" cy="9" r="2" />
						<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
					</svg>
					{images.length}
				</span>
			</div>

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
