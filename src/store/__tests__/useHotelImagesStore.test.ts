import { describe, it, expect, beforeEach } from "vitest";
import { useHotelImagesStore } from "../useHotelImagesStore";

function makeFile(
	name: string,
	size: number,
	type: string,
): File {
	const content = new ArrayBuffer(size);
	return new File([content], name, { type });
}

describe("useHotelImagesStore", () => {
	beforeEach(() => {
		useHotelImagesStore.setState({
			categorizedImages: {},
		});
	});

	// ─── addImage ──────────────────────────────────────────────

	describe("addImage", () => {
		it("adds a file to an empty category", () => {
			const file = makeFile("photo.jpg", 1000, "image/jpeg");
			useHotelImagesStore.getState().addImage("exterior", file, "blob:preview1");

			const state = useHotelImagesStore.getState();
			expect(state.categorizedImages.exterior).toHaveLength(1);
			expect(state.categorizedImages.exterior[0].file.name).toBe("photo.jpg");
			expect(state.categorizedImages.exterior[0].preview).toBe("blob:preview1");
			expect(state.categorizedImages.exterior[0].sort_order).toBe(0);
		});

		it("appends to existing category with correct sort_order", () => {
			const file1 = makeFile("photo1.jpg", 1000, "image/jpeg");
			const file2 = makeFile("photo2.jpg", 2000, "image/jpeg");

			useHotelImagesStore.getState().addImage("lobby", file1, "blob:p1");
			useHotelImagesStore.getState().addImage("lobby", file2, "blob:p2");

			const images = useHotelImagesStore.getState().categorizedImages.lobby;
			expect(images).toHaveLength(2);
			expect(images[0].sort_order).toBe(0);
			expect(images[1].sort_order).toBe(1);
		});

		it("handles multiple categories independently", () => {
			const extFile = makeFile("ext.jpg", 1000, "image/jpeg");
			const roomFile = makeFile("room.jpg", 2000, "image/png");

			useHotelImagesStore.getState().addImage("exterior", extFile, "blob:e1");
			useHotelImagesStore.getState().addImage("habitacion", roomFile, "blob:r1");

			const state = useHotelImagesStore.getState();
			expect(state.categorizedImages.exterior).toHaveLength(1);
			expect(state.categorizedImages.habitacion).toHaveLength(1);
			expect(state.categorizedImages.exterior[0].file.name).toBe("ext.jpg");
			expect(state.categorizedImages.habitacion[0].file.name).toBe("room.jpg");
		});
	});

	// ─── removeImage ───────────────────────────────────────────

	describe("removeImage", () => {
		it("removes an image by category and index", () => {
			const file1 = makeFile("a.jpg", 1000, "image/jpeg");
			const file2 = makeFile("b.jpg", 2000, "image/jpeg");
			const file3 = makeFile("c.jpg", 3000, "image/jpeg");

			useHotelImagesStore.getState().addImage("bano", file1, "blob:1");
			useHotelImagesStore.getState().addImage("bano", file2, "blob:2");
			useHotelImagesStore.getState().addImage("bano", file3, "blob:3");

			useHotelImagesStore.getState().removeImage("bano", 1);

			const images = useHotelImagesStore.getState().categorizedImages.bano;
			expect(images).toHaveLength(2);
			expect(images[0].file.name).toBe("a.jpg");
			expect(images[1].file.name).toBe("c.jpg");
		});

		it("recomputes sort_order after removal", () => {
			const file1 = makeFile("a.jpg", 1000, "image/jpeg");
			const file2 = makeFile("b.jpg", 2000, "image/jpeg");
			const file3 = makeFile("c.jpg", 3000, "image/jpeg");

			useHotelImagesStore.getState().addImage("bano", file1, "blob:1");
			useHotelImagesStore.getState().addImage("bano", file2, "blob:2");
			useHotelImagesStore.getState().addImage("bano", file3, "blob:3");

			useHotelImagesStore.getState().removeImage("bano", 0);

			const images = useHotelImagesStore.getState().categorizedImages.bano;
			expect(images[0].sort_order).toBe(0);
			expect(images[1].sort_order).toBe(1);
		});

		it("does nothing for invalid index", () => {
			const file = makeFile("a.jpg", 1000, "image/jpeg");
			useHotelImagesStore.getState().addImage("exterior", file, "blob:1");

			useHotelImagesStore.getState().removeImage("exterior", 99);

			expect(useHotelImagesStore.getState().categorizedImages.exterior).toHaveLength(1);
		});

		it("does nothing for empty category", () => {
			useHotelImagesStore.getState().removeImage("exterior", 0);
			expect(useHotelImagesStore.getState().categorizedImages.exterior).toBeUndefined();
		});
	});

	// ─── reorderImages ─────────────────────────────────────────

	describe("reorderImages", () => {
		it("moves image from one index to another", () => {
			const f1 = makeFile("a.jpg", 1000, "image/jpeg");
			const f2 = makeFile("b.jpg", 2000, "image/jpeg");
			const f3 = makeFile("c.jpg", 3000, "image/jpeg");

			useHotelImagesStore.getState().addImage("amenidades", f1, "blob:1");
			useHotelImagesStore.getState().addImage("amenidades", f2, "blob:2");
			useHotelImagesStore.getState().addImage("amenidades", f3, "blob:3");

			useHotelImagesStore.getState().reorderImages("amenidades", 2, 0);

			const images = useHotelImagesStore.getState().categorizedImages.amenidades;
			expect(images[0].file.name).toBe("c.jpg");
			expect(images[1].file.name).toBe("a.jpg");
			expect(images[2].file.name).toBe("b.jpg");
		});

		it("updates sort_order after reorder", () => {
			const f1 = makeFile("a.jpg", 1000, "image/jpeg");
			const f2 = makeFile("b.jpg", 2000, "image/jpeg");

			useHotelImagesStore.getState().addImage("restaurante", f1, "blob:1");
			useHotelImagesStore.getState().addImage("restaurante", f2, "blob:2");

			useHotelImagesStore.getState().reorderImages("restaurante", 1, 0);

			const images = useHotelImagesStore.getState().categorizedImages.restaurante;
			expect(images[0].sort_order).toBe(0);
			expect(images[0].file.name).toBe("b.jpg");
			expect(images[1].sort_order).toBe(1);
			expect(images[1].file.name).toBe("a.jpg");
		});
	});

	// ─── setCategory (re-categorize) ──────────────────────────

	describe("setCategory", () => {
		it("moves an image from one category to another", () => {
			const file = makeFile("photo.jpg", 1000, "image/jpeg");
			useHotelImagesStore.getState().addImage("otros", file, "blob:1");

			useHotelImagesStore.getState().setCategory("otros", 0, "exterior");

			const state = useHotelImagesStore.getState();
			expect(state.categorizedImages.otros).toBeUndefined();
			expect(state.categorizedImages.exterior).toHaveLength(1);
			expect(state.categorizedImages.exterior[0].file.name).toBe("photo.jpg");
		});

		it("removes from source and appends to target with correct sort_order", () => {
			const f1 = makeFile("a.jpg", 1000, "image/jpeg");
			const f2 = makeFile("b.jpg", 2000, "image/jpeg");
			const existing = makeFile("existing.jpg", 3000, "image/jpeg");

			useHotelImagesStore.getState().addImage("otros", f1, "blob:1");
			useHotelImagesStore.getState().addImage("otros", f2, "blob:2");
			useHotelImagesStore.getState().addImage("exterior", existing, "blob:e");

			useHotelImagesStore.getState().setCategory("otros", 0, "exterior");

			const state = useHotelImagesStore.getState();
			expect(state.categorizedImages.otros).toHaveLength(1);
			expect(state.categorizedImages.exterior).toHaveLength(2);
			expect(state.categorizedImages.exterior[1].sort_order).toBe(1);
		});
	});

	// ─── getTotalImageCount ────────────────────────────────────

	describe("getTotalImageCount", () => {
		it("returns 0 when store is empty", () => {
			expect(useHotelImagesStore.getState().getTotalImageCount()).toBe(0);
		});

		it("returns total across all categories", () => {
			const f1 = makeFile("a.jpg", 1000, "image/jpeg");
			const f2 = makeFile("b.jpg", 2000, "image/jpeg");
			const f3 = makeFile("c.jpg", 3000, "image/jpeg");

			useHotelImagesStore.getState().addImage("exterior", f1, "blob:1");
			useHotelImagesStore.getState().addImage("lobby", f2, "blob:2");
			useHotelImagesStore.getState().addImage("exterior", f3, "blob:3");

			expect(useHotelImagesStore.getState().getTotalImageCount()).toBe(3);
		});
	});

	// ─── hasExteriorImage ──────────────────────────────────────

	describe("hasExteriorImage", () => {
		it("returns false when no exterior images exist", () => {
			const file = makeFile("lobby.jpg", 1000, "image/jpeg");
			useHotelImagesStore.getState().addImage("lobby", file, "blob:1");

			expect(useHotelImagesStore.getState().hasExteriorImage()).toBe(false);
		});

		it("returns true when at least one exterior image exists", () => {
			const file = makeFile("facade.jpg", 1000, "image/jpeg");
			useHotelImagesStore.getState().addImage("exterior", file, "blob:1");

			expect(useHotelImagesStore.getState().hasExteriorImage()).toBe(true);
		});
	});

	// ─── clearAll ──────────────────────────────────────────────

	describe("clearAll", () => {
		it("clears all categorized images", () => {
			const f1 = makeFile("a.jpg", 1000, "image/jpeg");
			const f2 = makeFile("b.jpg", 2000, "image/jpeg");

			useHotelImagesStore.getState().addImage("exterior", f1, "blob:1");
			useHotelImagesStore.getState().addImage("lobby", f2, "blob:2");

			useHotelImagesStore.getState().clearAll();

			const state = useHotelImagesStore.getState();
			expect(state.categorizedImages).toEqual({});
			expect(state.getTotalImageCount()).toBe(0);
		});
	});
});
