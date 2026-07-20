// @vitest-environment jsdom
import "../../../__tests__/bun-test-dom-setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, cleanup, act } from "@testing-library/react";
import type { ImageCategory } from "@/types";
import { UI_CATEGORIES, CATEGORY_DISPLAY_ES } from "@/lib/image-category";

// ─── Mock URL.createObjectURL (not available in jsdom) ──────────
if (typeof URL.createObjectURL === "undefined") {
	URL.createObjectURL = vi.fn((blob: Blob) => `blob:mock-${blob.size}`);
	URL.revokeObjectURL = vi.fn();
}

// ─── Mock react-dropzone ───────────────────────────────────────
// Capture the config passed to useDropzone so tests can simulate
// file acceptance/rejection through the captured onDrop callback.
// ───────────────────────────────────────────────────────────────
let capturedDropzoneConfigs: {
	onDrop: (acceptedFiles: File[], rejectedFiles: unknown[], event: unknown) => void;
	onDropRejected?: (rejections: unknown[]) => void;
	accept?: Record<string, string[]>;
	maxSize?: number;
	multiple?: boolean;
}[] = [];

let mockIsDragActive = false;

vi.mock("react-dropzone", () => ({
	useDropzone: (config: Record<string, unknown>) => {
		const configEntry = {
			onDrop: config.onDrop as (acceptedFiles: File[], rejectedFiles: unknown[], event: unknown) => void,
			onDropRejected: config.onDropRejected as ((rejections: unknown[]) => void) | undefined,
			accept: config.accept as Record<string, string[]> | undefined,
			maxSize: config.maxSize as number | undefined,
			multiple: config.multiple as boolean | undefined,
		};
		capturedDropzoneConfigs.push(configEntry);
		const rootRef = vi.fn();
		const inputRef = vi.fn();
		return {
			getRootProps: () => ({
				ref: rootRef,
				onClick: vi.fn(),
				onDragEnter: vi.fn(),
				onDragOver: vi.fn(),
				onDragLeave: vi.fn(),
				onDrop: vi.fn(),
				role: "presentation" as const,
			}),
			getInputProps: () => ({
				ref: inputRef,
				type: "file" as const,
				accept: configEntry.accept
					? Object.values(configEntry.accept).flat().join(",")
					: "",
				multiple: configEntry.multiple ?? true,
				onChange: vi.fn(),
				style: { display: "none" },
			}),
			open: vi.fn(),
			acceptedFiles: [],
			rejectedFiles: [],
			isDragActive: mockIsDragActive,
			rootRef,
			inputRef,
		};
	},
}));

// ─── Mock next-intl ────────────────────────────────────────────
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}));

// Import AFTER mocks
import CategorizedDropzone from "../CategorizedDropzone";

// ─── Helpers ───────────────────────────────────────────────────
function makeFile(name: string, size: number, type: string): File {
	const content = new ArrayBuffer(size);
	return new File([content], name, { type });
}

// ─── Tests ─────────────────────────────────────────────────────
describe("CategorizedDropzone", () => {
	beforeEach(() => {
		cleanup();
		capturedDropzoneConfigs = [];
		mockIsDragActive = false;
	});

	// ─── T5: Renders 8 per-category containers with labels ─────

	it("renders exactly 7 category dropzone containers", () => {
		const { container } = render(<CategorizedDropzone />);
		const zones = container.querySelectorAll("[data-testid='category-dropzone']");
		expect(zones.length).toBe(7);
	});

	it("displays Spanish labels for all 8 categories", () => {
		const { getByText } = render(<CategorizedDropzone />);
		for (const cat of UI_CATEGORIES) {
			expect(getByText(CATEGORY_DISPLAY_ES[cat])).toBeDefined();
		}
	});

	it("each dropzone has its category data attribute", () => {
		const { container } = render(<CategorizedDropzone />);
		for (const cat of UI_CATEGORIES) {
			const zone = container.querySelector(
				`[data-testid="category-dropzone"][data-category="${cat}"]`,
			);
			expect(zone).not.toBeNull();
		}
	});

	// ─── T5: Accepts valid files ───────────────────────────────

	it("calls onFilesSelected when valid files are dropped on a category", async () => {
		const onFilesSelected = vi.fn();
		render(<CategorizedDropzone onFilesSelected={onFilesSelected} />);

		// UI_CATEGORIES[0] = 'exterior' — first zone rendered
		expect(capturedDropzoneConfigs.length).toBe(7);
		const exteriorConfig = capturedDropzoneConfigs[0];

		const validFile = makeFile("facade.jpg", 500_000, "image/jpeg");

		await act(async () => {
			exteriorConfig.onDrop([validFile], [], {});
		});

		expect(onFilesSelected).toHaveBeenCalledTimes(1);
		const [category, files] = onFilesSelected.mock.calls[0];
		expect(category).toBe("exterior");
		expect(files).toHaveLength(1);
		expect(files[0].name).toBe("facade.jpg");
	});

	it("accepts all valid MIME types (jpeg, png, webp)", () => {
		render(<CategorizedDropzone />);
		// Check any zone's accept config (all zones share the same accept)
		const config = capturedDropzoneConfigs[0];
		expect(config).not.toBeUndefined();

		const acceptTypes = config.accept ? Object.keys(config.accept) : [];
		expect(acceptTypes).toContain("image/jpeg");
		expect(acceptTypes).toContain("image/png");
		expect(acceptTypes).toContain("image/webp");
	});

	it("configures maxSize to 10MB", () => {
		render(<CategorizedDropzone />);
		expect(capturedDropzoneConfigs[0].maxSize).toBe(10 * 1024 * 1024);
	});

	// ─── T5: Rejects invalid files ─────────────────────────────

	it("does NOT call onFilesSelected when files are rejected by react-dropzone", async () => {
		const onFilesSelected = vi.fn();
		render(<CategorizedDropzone onFilesSelected={onFilesSelected} />);

		const config = capturedDropzoneConfigs[0];

		await act(async () => {
			// react-dropzone sends rejected files when validation fails
			config.onDrop([], [{ file: makeFile("doc.pdf", 1000, "application/pdf"), errors: [] }], {});
		});

		expect(onFilesSelected).not.toHaveBeenCalled();
	});

	it("rejects files exceeding 10MB via onDropRejected", async () => {
		const onDropRejected = vi.fn();
		render(<CategorizedDropzone onDropRejected={onDropRejected} />);

		const config = capturedDropzoneConfigs[0];
		const oversized = makeFile("huge.jpg", 11 * 1024 * 1024, "image/jpeg");
		const rejectedEntry = { file: oversized, errors: [{ code: "file-too-large", message: "too large" }] };

		// react-dropzone calls onDropRejected (not onDrop) for rejected files
		expect(config.onDropRejected).toBeDefined();
		await act(async () => {
			config.onDropRejected!([rejectedEntry]);
		});

		expect(onDropRejected).toHaveBeenCalledTimes(1);
	});

	// ─── Preview rendering ─────────────────────────────────────

	it("displays image previews when images prop is provided", () => {
		const images = [
			{ url: "https://example.com/ext1.webp", preview: "blob:preview1", category: "exterior" as ImageCategory, sort_order: 0 },
			{ url: "https://example.com/ext2.webp", preview: "blob:preview2", category: "exterior" as ImageCategory, sort_order: 1 },
		];

		const { container } = render(<CategorizedDropzone images={images} />);
		const previewImgs = container.querySelectorAll("img[data-testid='image-preview']");
		expect(previewImgs.length).toBe(2);
	});

	it("groups previews by category", () => {
		const images = [
			{ url: "https://example.com/ext.webp", preview: "blob:p1", category: "exterior" as ImageCategory, sort_order: 0 },
			{ url: "https://example.com/lobby.webp", preview: "blob:p2", category: "lobby" as ImageCategory, sort_order: 0 },
		];

		const { container } = render(<CategorizedDropzone images={images} />);

		const extZone = container.querySelector('[data-category="exterior"]');
		const lobbyZone = container.querySelector('[data-category="lobby"]');

		expect(extZone!.querySelectorAll("img[data-testid='image-preview']").length).toBe(1);
		expect(lobbyZone!.querySelectorAll("img[data-testid='image-preview']").length).toBe(1);
	});
});
