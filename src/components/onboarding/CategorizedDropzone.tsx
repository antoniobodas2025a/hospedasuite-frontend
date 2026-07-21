"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X } from "lucide-react";
import { UI_CATEGORIES, CATEGORY_DISPLAY_ES } from "@/lib/image-category";
import type { ImageCategory } from "@/types";

/**
 * Image preview entry passed to the component for display.
 */
export interface CategorizedPreview {
	url: string;
	preview: string;
	category: ImageCategory;
	sort_order: number;
}

/**
 * File metadata passed back when files are selected for a category.
 */
export interface CategoryFileSelection {
	category: ImageCategory;
	files: File[];
	previews: string[];
}

export interface CategorizedDropzoneProps {
	/** Called when valid files are accepted for a category */
	onFilesSelected?: (
		category: ImageCategory,
		files: File[],
		previews: string[],
	) => void;
	/** Called when files are rejected (wrong type, too large) */
	onDropRejected?: (rejections: { file: File; errors: readonly unknown[] }[]) => void;
	/** Current previews to display, grouped by category */
	images?: CategorizedPreview[];
	/** Called when user removes an image preview */
	onRemoveImage?: (category: ImageCategory, index: number) => void;
}

const ACCEPT = {
	"image/jpeg": [".jpg", ".jpeg"],
	"image/png": [".png"],
	"image/webp": [".webp"],
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Renders 7 category-segregated dropzones (Ley de Hick).
 * Each dropzone accepts images only for its category.
 * Note: "habitacion" category is excluded from UI to avoid confusion with Step 3.
 */
export default function CategorizedDropzone({
	onFilesSelected,
	onDropRejected,
	images = [],
	onRemoveImage,
}: CategorizedDropzoneProps) {
	return (
		<div className="space-y-4">
			{UI_CATEGORIES.map((category) => (
				<CategoryZone
					key={category}
					category={category}
					label={CATEGORY_DISPLAY_ES[category]}
					previews={images.filter((img) => img.category === category)}
					onFilesSelected={onFilesSelected}
					onDropRejected={onDropRejected}
					onRemoveImage={onRemoveImage}
				/>
			))}
		</div>
	);
}

interface CategoryZoneProps {
	category: ImageCategory;
	label: string;
	previews: CategorizedPreview[];
	onFilesSelected?: (
		category: ImageCategory,
		files: File[],
		previews: string[],
	) => void;
	onDropRejected?: (rejections: { file: File; errors: readonly unknown[] }[]) => void;
	onRemoveImage?: (category: ImageCategory, index: number) => void;
}

function CategoryZone({
	category,
	label,
	previews,
	onFilesSelected,
	onDropRejected,
	onRemoveImage,
}: CategoryZoneProps) {
	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (acceptedFiles.length === 0) return;
			const previewUrls = acceptedFiles.map((f) => URL.createObjectURL(f));
			onFilesSelected?.(category, acceptedFiles, previewUrls);
		},
		[category, onFilesSelected],
	);

	const onDropRejectedHandler = useCallback(
		(rejectedFiles: { file: File; errors: readonly unknown[] }[]) => {
			onDropRejected?.(rejectedFiles);
		},
		[onDropRejected],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop: onDrop,
		onDropRejected: onDropRejectedHandler,
		accept: ACCEPT,
		maxSize: MAX_SIZE,
		multiple: true,
	});

	return (
		<div
			data-testid="category-dropzone"
			data-category={category}
			className="space-y-2"
		>
			<h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
				{label}
			</h4>

			{/* Preview grid */}
			{previews.length > 0 && (
				<div className="grid grid-cols-4 gap-2">
					{previews.map((img, i) => (
						<div key={i} className="relative group aspect-square">
							<img
								src={img.preview}
								alt={`${label} ${i + 1}`}
								data-testid="image-preview"
								className="w-full h-full object-cover rounded-lg border border-white/10"
							/>
							{onRemoveImage && (
								<button
									type="button"
									onClick={() => onRemoveImage(category, i)}
									className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
									aria-label={`Remove image ${i + 1}`}
								>
									<X size={12} />
								</button>
							)}
						</div>
					))}
				</div>
			)}

			{/* Dropzone area */}
			<div
				{...getRootProps()}
				className={`flex items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
					isDragActive
						? "border-indigo-500 bg-indigo-500/10"
						: "border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5"
				}`}
			>
				<input {...getInputProps()} />
				<UploadCloud
					className={`mr-2 ${isDragActive ? "text-indigo-400" : "text-zinc-500"}`}
					size={20}
				/>
				<p className="text-xs text-zinc-500">
					Arrastra fotos o <span className="text-indigo-400">selecciona</span>
				</p>
			</div>
		</div>
	);
}
