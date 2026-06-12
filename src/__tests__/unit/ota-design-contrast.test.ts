import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ============================================================================
// Channel Design Contrast — TDD Test Suite
// Validates token presence in globals.css and semantic classNames in Channel components.
// These are file-content contract tests — the spec requires specific CSS tokens
// to exist and specific className patterns to be present/absent in source files.
// ============================================================================

const PROJECT_ROOT = resolve(__dirname, "../..");
const globalsCss = readFileSync(
	resolve(PROJECT_ROOT, "app/globals.css"),
	"utf-8",
);

function readOtaComponent(filename: string): string {
	return readFileSync(
		resolve(PROJECT_ROOT, "components/ota", filename),
		"utf-8",
	);
}

// Extract content within [data-theme="ota"] { ... } block (light mode, not .dark)
function getOtaThemeBlock(css: string): string {
	// Find [data-theme="ota"] { ... } before .dark variant
	const startMarker = '[data-theme="ota"] {';
	const startIdx = css.indexOf(startMarker);
	if (startIdx === -1) return "";
	// Find the closing brace that ends the light-mode block (before .dark variant)
	// The .dark variant starts with [data-theme="ota"].dark
	const darkMarker = '[data-theme="ota"].dark';
	const darkIdx = css.indexOf(darkMarker, startIdx);
	const searchEnd = darkIdx !== -1 ? darkIdx : css.length;
	const block = css.slice(startIdx, searchEnd);
	// Find matching closing brace
	let depth = 0;
	let endIdx = startIdx;
	for (let i = startIdx; i < searchEnd; i++) {
		if (css[i] === "{") depth++;
		else if (css[i] === "}") {
			depth--;
			if (depth === 0) {
				endIdx = i + 1;
				break;
			}
		}
	}
	return css.slice(startIdx, endIdx);
}

// ============================================================================
// ACCEPTANCE CRITERIA
// ============================================================================

describe("AC1 — Channel Glass Override Variables (T1)", () => {
	const otaBlock = getOtaThemeBlock(globalsCss);

	const requiredVars = [
		"--glass-light-surface",
		"--glass-light-border",
		"--glass-heavy-surface",
		"--glass-heavy-border",
		"--glass-pill-surface",
		"--glass-pill-border",
	];

	for (const varName of requiredVars) {
		it(`defines ${varName} in [data-theme="ota"] block`, () => {
			expect(otaBlock).toContain(varName);
		});
	}

	it("defines all 6 glass override variables", () => {
		const found = requiredVars.filter((v) => otaBlock.includes(v));
		expect(found).toHaveLength(6);
	});

	it("glass-light-surface uses oklch(from var(--card) ...)", () => {
		// Should derive from --card using oklch relative color syntax
		const lines = otaBlock.split("\n");
		const surfaceLine = lines.find(
			(l) => l.includes("--glass-light-surface:") && !l.includes("-dark"),
		);
		expect(surfaceLine).toBeDefined();
		expect(surfaceLine).toMatch(/oklch\(from\s+var\(--card\)/);
	});
});

describe("AC2 — Channel Status Foreground Tokens (T2)", () => {
	const otaBlock = getOtaThemeBlock(globalsCss);

	const requiredVars = [
		"--success-foreground",
		"--warning-foreground",
		"--urgent-foreground",
	];

	for (const varName of requiredVars) {
		it(`defines ${varName} in [data-theme="ota"] block`, () => {
			expect(otaBlock).toContain(varName);
		});
	}

	it("defines all 3 status foreground tokens", () => {
		const found = requiredVars.filter((v) => otaBlock.includes(v));
		expect(found).toHaveLength(3);
	});
});

// ============================================================================
// COMPONENT ACCEPTANCE CRITERIA
// ============================================================================

describe("AC3 — Zero text-background on glass surfaces (T4)", () => {
	const roomShowcase = readOtaComponent("RoomShowcaseModal.tsx");

	it("has NO text-background class in RoomShowcaseModal.tsx", () => {
		// All three occurrences should be replaced with text-foreground
		expect(roomShowcase).not.toMatch(/\btext-background\b/);
	});

	it("has text-foreground on CTA buttons", () => {
		// The three buttons that previously had text-background should now have text-foreground
		const buttonWithForeground = roomShowcase.match(/text-foreground/g);
		expect(buttonWithForeground).not.toBeNull();
		expect(buttonWithForeground!.length).toBeGreaterThanOrEqual(3);
	});
});

describe("AC4 — Zero text-black in HotelCard (T5)", () => {
	const hotelCard = readOtaComponent("HotelCard.tsx");

	it("has NO text-black in HotelCard.tsx", () => {
		expect(hotelCard).not.toMatch(/\btext-black\b/);
	});
});

describe("AC5 — Zero text-white on status badges (T6, T7)", () => {
	it("RoomCard has no text-white on success badge", () => {
		const roomCard = readOtaComponent("RoomCard.tsx");
		expect(roomCard).not.toMatch(/bg-success\s+text-white/);
		expect(roomCard).not.toMatch(/bg-success\s+\S*\btext-white\b/);
	});

	it("RoomCard has no text-white on warning badge", () => {
		const roomCard = readOtaComponent("RoomCard.tsx");
		expect(roomCard).not.toMatch(/bg-warning\S*\s+text-white/);
	});

	it("RoomCard has no text-white on urgent badge", () => {
		const roomCard = readOtaComponent("RoomCard.tsx");
		expect(roomCard).not.toMatch(/bg-urgent\s+text-white/);
	});

	it("ChannelDashboard has no text-white on brand bg (T6)", () => {
		const dashboard = readOtaComponent("ChannelDashboard.tsx");
		// text-white on brand bg should be text-primary-foreground
		expect(dashboard).toMatch(/text-primary-foreground/);
	});
});

describe("AC6 — Zero hover:bg-brand- in Channel CTA buttons (T8-T15)", () => {
	const otaFiles = [
		"RoomShowcaseModal.tsx",
		"RoomCard.tsx",
		"AvailabilitySearchBar.tsx",
		"BookingWidget.tsx",
		"MobileStickyCta.tsx",
		"ReviewForm.tsx",
		"ChannelDashboard.tsx",
	];

	for (const filename of otaFiles) {
		it(`${filename} has NO hover:bg-brand-(600|700|800) CTA hovers`, () => {
			const content = readOtaComponent(filename);
			expect(content).not.toMatch(/hover:bg-brand-[678]00/);
		});
	}
});

describe("AC7 — Zero shadow-black/ in Channel components (T17)", () => {
	const filesWithShadowChanges = [
		"StickySubNav.tsx",
		"MobileStickyCta.tsx",
		"RoomGallery.tsx",
		"RoomShowcaseModal.tsx",
	];

	for (const filename of filesWithShadowChanges) {
		it(`${filename} has NO shadow-black/`, () => {
			const content = readOtaComponent(filename);
			expect(content).not.toMatch(/shadow-black\//);
		});
	}
});

describe("AC8 — Zero bg-white/90 in HeroGallery non-overlay (T16)", () => {
	const heroGallery = readOtaComponent("HeroGallery.tsx");

	it("has NO bg-white/90", () => {
		expect(heroGallery).not.toMatch(/bg-white\/90/);
	});

	it("has bg-card/90 for mobile nav", () => {
		expect(heroGallery).toMatch(/bg-card\/90/);
	});
});

describe("AC9 — RoomShowcaseModal uses imported GlassCard (T3)", () => {
	const roomShowcase = readOtaComponent("RoomShowcaseModal.tsx");

	it("has NO local GlassCard function definition", () => {
		expect(roomShowcase).not.toMatch(/function GlassCard/);
	});

	it("uses GlassCard as JSX element (imported)", () => {
		// The imported GlassCard should be rendered via <GlassCard ...>
		expect(roomShowcase).toMatch(/<GlassCard/);
	});
});

// ============================================================================
// SEMANTIC TOKEN PRESENCE (positive checks)
// ============================================================================

describe("Semantic hover tokens in Channel components", () => {
	it("BookingWidget uses hover:bg-primary/90", () => {
		const content = readOtaComponent("BookingWidget.tsx");
		expect(content).toMatch(/hover:bg-primary\/90/);
	});

	it("BookingWidget uses to-primary/90 gradient", () => {
		const content = readOtaComponent("BookingWidget.tsx");
		expect(content).toMatch(/to-primary\/90/);
	});

	it("HeroGallery uses hover:bg-card", () => {
		const content = readOtaComponent("HeroGallery.tsx");
		expect(content).toMatch(/hover:bg-card/);
	});

	it("RoomShowcaseModal uses hover:bg-accent/25 on close button", () => {
		const content = readOtaComponent("RoomShowcaseModal.tsx");
		expect(content).toMatch(/hover:bg-accent\/25/);
	});
});

describe("Semantic shadow tokens in Channel components", () => {
	it("StickySubNav uses shadow-elev-1", () => {
		const content = readOtaComponent("StickySubNav.tsx");
		expect(content).toMatch(/shadow-elev-1/);
	});

	it("MobileStickyCta uses shadow-elev-2", () => {
		const content = readOtaComponent("MobileStickyCta.tsx");
		expect(content).toMatch(/shadow-elev-2/);
	});

	it("RoomGallery uses shadow-elev-2", () => {
		const content = readOtaComponent("RoomGallery.tsx");
		expect(content).toMatch(/shadow-elev-2/);
	});

	it("RoomShowcaseModal uses shadow-elev-2", () => {
		const content = readOtaComponent("RoomShowcaseModal.tsx");
		expect(content).toMatch(/shadow-elev-2/);
	});

	it("RoomShowcaseModal uses shadow-elev-1 on close button", () => {
		const content = readOtaComponent("RoomShowcaseModal.tsx");
		expect(content).toMatch(/shadow-elev-1/);
	});
});

describe("Status foreground tokens in RoomCard (T7)", () => {
	const roomCard = readOtaComponent("RoomCard.tsx");

	it("uses text-success-foreground", () => {
		expect(roomCard).toMatch(/text-success-foreground/);
	});

	it("uses text-warning-foreground", () => {
		expect(roomCard).toMatch(/text-warning-foreground/);
	});

	it("uses text-urgent-foreground", () => {
		expect(roomCard).toMatch(/text-urgent-foreground/);
	});

	it("uses text-primary-foreground on brand badge (preserved)", () => {
		expect(roomCard).toMatch(/bg-brand-500\s+text-primary-foreground/);
	});
});
