"use client";

import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import CategorizedDropzone from "./CategorizedDropzone";
import type { CategorizedPreview } from "./CategorizedDropzone";
import { useHotelImagesStore } from "@/store/useHotelImagesStore";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import type { ImageCategory } from "@/types";

export default function PropertyGalleryStep() {
	const t = useTranslations("onboarding.gallery");
	const { validationErrors } = useOnboardingStore();
	const {
		hasExteriorImage,
		getTotalImageCount,
		addImage,
		removeImage,
	} = useHotelImagesStore();

	const hasErrors = validationErrors["step-2"];
	const totalImages = getTotalImageCount();
	const needsExterior = !hasExteriorImage();

	const handleFilesSelected = useCallback(
		(category: ImageCategory, files: File[], previews: string[]) => {
			files.forEach((file, i) => {
				addImage(category, file, previews[i]);
			});
		},
		[addImage],
	);

	const handleRemoveImage = useCallback(
		(category: ImageCategory, index: number) => {
			removeImage(category, index);
		},
		[removeImage],
	);

	// Build previews from store for display — empty for now (Phase 5 will wire URLs)
	const previewImages: CategorizedPreview[] = [];

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ type: "spring", stiffness: 300, damping: 24, mass: 1.0 }}
			className="space-y-8 max-w-xl mx-auto"
		>
			<div className="text-center space-y-2">
				<h3 className="text-2xl font-bold text-white">{t("title")}</h3>
				<p className="text-zinc-500 text-sm">{t("subtitle")}</p>
			</div>

			{/* Validation errors */}
			{hasErrors && (
				<div className="bg-rose-500/10 border border-rose-500/30 rounded-[var(--radius-squircle-xl)] p-4">
					<p className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
						⚠️ {hasErrors}
					</p>
				</div>
			)}

			{/* Exterior image required warning */}
			{needsExterior && totalImages > 0 && (
				<div className="bg-amber-500/10 border border-amber-500/30 rounded-[var(--radius-squircle-xl)] p-4">
					<p className="text-amber-400 text-xs font-bold">
						⚠️ Se requiere al menos una foto de exterior
					</p>
				</div>
			)}

			{/* 8 Categorized Dropzones */}
			<CategorizedDropzone
				onFilesSelected={handleFilesSelected}
				images={previewImages}
				onRemoveImage={handleRemoveImage}
			/>

			{/* Total count */}
			<div className="text-xs text-zinc-600 text-center">
				{totalImages} fotos subidas
			</div>
		</motion.div>
	);
}
