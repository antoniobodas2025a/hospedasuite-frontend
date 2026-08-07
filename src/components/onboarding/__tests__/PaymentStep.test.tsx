// @vitest-environment jsdom
import "../../../__tests__/bun-test-dom-setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";

// ─── Mock framer-motion ────────────────────────────────────────
vi.mock("framer-motion", () => ({
	motion: {
		div: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("div", {}, children),
		button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
			React.createElement("button", { ...props }, children),
	},
}));

// ─── Mock next-intl ────────────────────────────────────────────
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => "es",
}));

// ─── Mock child components ─────────────────────────────────────
vi.mock("@/components/onboarding/TermsAcceptance", () => ({
	default: ({ accepted, onAcceptanceChange }: { accepted: boolean; onAcceptanceChange: (v: boolean) => void }) => (
		<label>
			<input
				type="checkbox"
				checked={accepted}
				onChange={(e) => onAcceptanceChange(e.target.checked)}
				data-testid="terms-checkbox"
			/>
			Acepto términos
		</label>
	),
}));

vi.mock("@/components/payments/WompiButton", () => ({
	default: () => <button data-testid="wompi-button">Pagar con Wompi</button>,
}));

vi.mock("./ManualPaymentCard", () => ({
	default: () => <div data-testid="manual-payment-card">ManualPaymentCard</div>,
}));

// ─── Mock useOnboardingStore ───────────────────────────────────
const defaultState = {
	hotelIdentity: { name: "Hotel Test", city: "Medellín", location: "" },
	rooms: [{ price: 120000 }, { price: 150000 }],
	galleryFiles: [{ name: "photo1.jpg" } as File, { name: "photo2.jpg" } as File, { name: "photo3.jpg" } as File],
	paymentMethod: null,
	setPaymentMethod: vi.fn(),
	paymentPrice: 89900,
	paymentTransactionId: null,
	setPaymentTransactionId: vi.fn(),
	manualReceiptUrl: null,
	termsAccepted: false,
	setTermsAccepted: vi.fn(),
	startProvisioning: vi.fn(),
};

vi.mock("@/store/useOnboardingStore", () => ({
	useOnboardingStore: vi.fn(() => defaultState),
}));

// Import AFTER mocks
import PaymentStep from "../PaymentStep";
import { useOnboardingStore } from "@/store/useOnboardingStore";

const mockedUseOnboardingStore = useOnboardingStore as unknown as ReturnType<typeof vi.fn>;

describe("PaymentStep", () => {
	beforeEach(() => {
		cleanup();
		mockedUseOnboardingStore.mockReturnValue({ ...defaultState });
	});

	it("renders the property review summary", () => {
		const { getByText } = render(<PaymentStep />);
		expect(getByText("Hotel Test")).toBeDefined();
		expect(getByText("2")).toBeDefined();
		expect(getByText("unidades")).toBeDefined();
		expect(getByText("3")).toBeDefined();
		expect(getByText("fotos")).toBeDefined();
	});

	it("shows payment method options", () => {
		const { getByText } = render(<PaymentStep />);
		expect(getByText("Wompi")).toBeDefined();
		expect(getByText("Manual")).toBeDefined();
		expect(getByText("Activar gratis")).toBeDefined();
	});

	it("shows the activate button after selecting the free method and accepting terms", () => {
		const setPaymentMethod = vi.fn();
		const setPaymentTransactionId = vi.fn();
		const setTermsAccepted = vi.fn();
		const startProvisioning = vi.fn();

		mockedUseOnboardingStore.mockReturnValue({
			...defaultState,
			paymentMethod: "free",
			paymentTransactionId: "FREE-123",
			termsAccepted: true,
			setPaymentMethod,
			setPaymentTransactionId,
			setTermsAccepted,
			startProvisioning,
		});

		const { getByText } = render(<PaymentStep />);
		const activateButton = getByText("Activar propiedad (prueba gratis)");
		expect(activateButton).toBeDefined();

		fireEvent.click(activateButton);
		expect(startProvisioning).toHaveBeenCalledTimes(1);
	});

	it("does NOT call startProvisioning when terms are not accepted", () => {
		const startProvisioning = vi.fn();
		mockedUseOnboardingStore.mockReturnValue({
			...defaultState,
			paymentMethod: "free",
			paymentTransactionId: "FREE-123",
			termsAccepted: false,
			startProvisioning,
		});

		const { getByText } = render(<PaymentStep />);
		const activateButton = getByText("Activar propiedad (prueba gratis)") as HTMLButtonElement;
		expect(activateButton.disabled).toBe(true);

		fireEvent.click(activateButton);
		expect(startProvisioning).not.toHaveBeenCalled();
	});
});
