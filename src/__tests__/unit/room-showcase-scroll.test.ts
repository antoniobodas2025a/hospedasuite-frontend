import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

/**
 * RoomShowcaseModal Scroll Layout Tests
 *
 * Validates that the modal follows Nielsen Heuristic #3 (Control & Freedom):
 * - Gallery scrolls naturally with content (no sticky/fixed obstruction)
 * - Single scroll container for mobile layout
 * - Dock remains fixed at bottom
 * - No h-screen or sticky top-0 blocking natural DOM flow
 */

const MODAL_PATH = path.resolve(
  __dirname,
  "../../components/ota/RoomShowcaseModal.tsx",
);

function readModalSource(): string {
  if (!existsSync(MODAL_PATH)) {
    throw new Error(`RoomShowcaseModal.tsx not found at ${MODAL_PATH}`);
  }
  return readFileSync(MODAL_PATH, "utf-8");
}

describe("RoomShowcaseModal — Scroll Layout Immunity", () => {
  const source = readModalSource();

  // ==========================================================================
  // MUTATION 1: Gallery must NOT be shrink-0 in mobile layout
  // If shrink-0 exists on the gallery wrapper, the gallery stays pinned
  // and doesn't scroll with content — violates Heuristic #3
  // ==========================================================================
  describe("Heuristic #3: Gallery scrolls with content (mobile)", () => {
    it("MUST NOT have shrink-0 on the mobile gallery wrapper", () => {
      // Extract the mobile section (lg:hidden block)
      const mobileMatch = source.match(
        /\/\*\s*MOBILE\/\s*TABLET.*?\n\s*<div\s+className="([^"]*lg:hidden[^"]*)"/,
      );
      expect(mobileMatch).not.toBeNull();

      const mobileBlock = source.slice(
        source.indexOf("lg:hidden flex flex-col"),
        source.indexOf("Dock de cierre mobile"),
      );

      // The gallery wrapper should NOT have shrink-0
      // It should be part of the natural scroll flow
      const galleryWrapperMatch = mobileBlock.match(
        /Galeria compacta[\s\S]*?<div\s+className="([^"]*)"[^>]*>\s*<RoomGallery/,
      );
      expect(galleryWrapperMatch).not.toBeNull();

      const galleryWrapperClasses = galleryWrapperMatch![1];
      expect(galleryWrapperClasses).not.toContain("shrink-0");
    });

    it("MUST have the gallery INSIDE the scrollable container", () => {
      // The gallery should be inside the overflow-y-auto container
      // not as a sibling with shrink-0
      const mobileBlock = source.slice(
        source.indexOf("lg:hidden flex flex-col"),
        source.indexOf("Dock de cierre mobile"),
      );

      // Check that RoomGallery appears BEFORE the overflow-y-auto div closes
      // and is NOT wrapped in a shrink-0 div
      const hasGalleryInScrollFlow =
        mobileBlock.includes("overflow-y-auto") &&
        !mobileBlock.match(/shrink-0[^>]*>[\s\S]*?<RoomGallery/);

      expect(hasGalleryInScrollFlow).toBe(true);
    });
  });

  // ==========================================================================
  // MUTATION 2: Single scroll container for mobile
  // Miller's Law: gallery + amenities + summary = 3 chunks in 1 scroll
  // ==========================================================================
  describe("Miller's Law: Single scroll container (mobile)", () => {
    it("MUST have exactly ONE overflow-y-auto container in mobile layout", () => {
      const mobileBlock = source.slice(
        source.indexOf("lg:hidden flex flex-col"),
        source.indexOf("Dock de cierre mobile"),
      );

      const overflowCount = (
        mobileBlock.match(/overflow-y-auto/g) || []
      ).length;

      expect(overflowCount).toBe(1);
    });

    it("MUST NOT have nested overflow-y-auto that creates dual-scroll", () => {
      const mobileBlock = source.slice(
        source.indexOf("lg:hidden flex flex-col"),
        source.indexOf("Dock de cierre mobile"),
      );

      // Count divs with overflow-y-auto
      const nestedMatches = mobileBlock.match(
        /<div[^>]*overflow-y-auto[^>]*>/g,
      );
      expect(nestedMatches?.length || 0).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // MUTATION 3: Dock must remain fixed at bottom
  // ==========================================================================
  describe("Dock immunity: Fixed at bottom", () => {
    it("MUST have absolute bottom-0 on the mobile dock", () => {
      const dockMatch = source.match(
        /Dock de cierre mobile[\s\S]*?className="([^"]*absolute[^"]*bottom-0[^"]*)"/,
      );
      expect(dockMatch).not.toBeNull();
      expect(dockMatch![1]).toContain("absolute");
      expect(dockMatch![1]).toContain("bottom-0");
    });

    it("Dock MUST have z-20 or higher to stay above scrolled content", () => {
      const dockMatch = source.match(
        /Dock de cierre mobile[\s\S]*?className="([^"]*)"[^>]*>/,
      );
      expect(dockMatch).not.toBeNull();
      const hasZIndex = /z-\[?2[0-9]|z-30|z-40|z-50/.test(dockMatch![1]);
      expect(hasZIndex).toBe(true);
    });
  });

  // ==========================================================================
  // MUTATION 4: No blocking layout classes
  // ==========================================================================
  describe("Layout purity: No blocking classes", () => {
    it("MUST NOT have h-screen on any content container", () => {
      // h-screen on content containers blocks natural scroll
      const hScreenMatches = source.match(
        /<div[^>]*h-screen[^>]*>/g,
      );
      expect(hScreenMatches).toBeNull();
    });

    it("MUST NOT have sticky top-0 on gallery or content sections", () => {
      const stickyMatches = source.match(
        /<div[^>]*sticky[^>]*top-0[^>]*>/g,
      );
      expect(stickyMatches).toBeNull();
    });
  });

  // ==========================================================================
  // MUTATION 5: Desktop layout must remain intact
  // ==========================================================================
  describe("Desktop layout preservation", () => {
    it("Desktop gallery wrapper MUST keep shrink-0 (separate panel layout)", () => {
      // Desktop uses a two-panel layout where gallery is in its own panel
      // shrink-0 is correct there — only mobile needs the fix
      const desktopBlock = source.slice(
        source.indexOf("DESKTOP: full scroll"),
        source.indexOf("MOBILE/ TABLET"),
      );

      const desktopGalleryMatch = desktopBlock.match(
        /Galeria — scrolls[\s\S]*?<div\s+className="([^"]*)"[^>]*>\s*<RoomGallery/,
      );
      expect(desktopGalleryMatch).not.toBeNull();

      // Desktop should keep its layout (shrink-0 is fine for the separate panel)
      expect(desktopGalleryMatch![1]).toContain("shrink-0");
    });
  });
});
