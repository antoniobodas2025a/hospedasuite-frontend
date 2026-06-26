"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	LogOut,
	Calculator,
	Lock,
	ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NavButton from "../ui/NavButton";
import { MENU_GROUPS } from "@/config/menuItems";
import { logout, logoutStaff } from "@/app/actions/auth";
import ShiftReportModal from "@/components/modals/ShiftReportModal";
import PropertySwitcher from "./PropertySwitcher";


export interface HotelOption {
	id: string;
	name: string;
	city: string;
	slug: string;
	subscription_plan: string;
	subscription_status: string;
	role: string;
}

export interface SidebarViewProps {
	hotelName: string;
	hotelId: string;
	myHotels: HotelOption[];
	user?: {
		id: string;
		email?: string;
	};
	staffIdentity?: {
		id: string;
		name: string;
		role: string;
	};
	currentPath: string;
	/** Plan de suscripción actual del hotel. Se usa para gating de menú y badge visual. */
	subscriptionPlan?: "starter" | "pro" | "enterprise";
	onLogout: () => void;
	onOpenShiftModal: () => void;
}

interface SidebarProps {
	hotelName?: string;
	hotelId?: string;
	myHotels?: HotelOption[];
	user?: {
		id: string;
		email?: string;
	};
	staffIdentity?: {
		id: string;
		name: string;
		role: string;
	};
	subscriptionPlan?: "starter" | "pro" | "enterprise";
}

const SidebarView: React.FC<SidebarViewProps> = ({
	hotelName,
	hotelId,
	myHotels = [],
	
	currentPath,
	subscriptionPlan = "starter",
	onLogout,
	onOpenShiftModal,
	staffIdentity,
	user,
}) => {
	// Ley de Miller: collapse non-essential groups by default
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
		new Set(["services", "management", "system"]),
	);

	// Identidad visual: Admin (email) o Staff (nombre + rol)
	const displayIdentity = user?.email
		? { label: user.email, badge: "Admin", badgeColor: "text-indigo-400" }
		: staffIdentity
			? { label: staffIdentity.name, badge: staffIdentity.role, badgeColor: "text-emerald-400" }
			: null;

	// Construir lista de propiedades para el selector
	const hotelsForSwitcher = myHotels.length > 0
		? myHotels
		: [{ id: hotelId, name: hotelName, city: '', slug: '', subscription_plan: subscriptionPlan, subscription_status: 'active', role: 'admin' }];

	const toggleGroup = (id: string) => {
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};
	return (
		<aside className="hidden md:flex w-72 glass-panel text-sidebar-foreground flex-col shadow-2xl z-20 rounded-r-[var(--radius-squircle-3xl)] my-4 ml-4 h-[calc(100vh-2rem)] sticky top-4">
			{/* Selector de Propiedades — Invariante de Aislamiento Operativo */}
			<div className="p-6 border-b border-border">
				<PropertySwitcher
					currentHotelId={hotelId}
					currentHotelName={hotelName}
					hotels={hotelsForSwitcher}
					variant="sidebar"
				/>
			</div>

			{/* Plan badge + identidad del usuario */}
			<div className="px-8 pb-3 flex items-center justify-between">
				<p className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase">
					{subscriptionPlan === "enterprise" ? (
						<span className="text-amber-400">Enterprise</span>
					) : subscriptionPlan === "pro" ? (
						<span className="text-indigo-400">Pro</span>
					) : (
						<span className="text-muted-foreground">Starter</span>
					)}
				</p>
				{displayIdentity && (
					<div className="flex items-center gap-1.5 truncate">
						<div className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
						<span className="text-[10px] text-sidebar-foreground/70 truncate font-medium">
							{displayIdentity.label}
						</span>
						<span className={`text-[9px] font-bold uppercase tracking-wider ${displayIdentity.badgeColor}`}>
							{displayIdentity.badge}
						</span>
					</div>
				)}
			</div>

			{/* Navegación agrupada — Ley de Miller: 4 chunks */}
			<nav className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
				{MENU_GROUPS.map((group) => {
					const hasActive = group.items.some(
						(item) =>
							currentPath === item.href ||
							(currentPath.startsWith(item.href) && item.href !== "/dashboard"),
					);

					// Determina si al menos un ítem del grupo es visible (no bloqueado)
					const planLevel = { starter: 0, pro: 1, enterprise: 2 } as const;
					const currentLevel = planLevel[subscriptionPlan];
					const hasVisible = group.items.some(
						(item) =>
							!item.minPlan || currentLevel >= (planLevel[item.minPlan] ?? 0),
					);

					if (!hasVisible) return null;

					return (
						<div key={group.id}>
							{/* Section header — only visible when group has active item or on hover */}
							<h2
								className={cn(
									"text-[10px] font-bold uppercase tracking-widest mb-2 px-4 transition-colors duration-200 cursor-pointer flex items-center gap-1",
									hasActive
										? "text-brand-400"
										: "text-muted-foreground/40 hover:text-muted-foreground/60",
								)}
								onClick={() => toggleGroup(group.id)}
							>
								{group.label}
								<ChevronDown
									className={cn(
										"size-3 transition-transform",
										collapsedGroups.has(group.id) ? "" : "rotate-180",
									)}
								/>
							</h2>
							{!collapsedGroups.has(group.id) && (
								<div className="space-y-1">
									{group.items.map((item) => {
										const isActive =
											currentPath === item.href ||
											(currentPath.startsWith(item.href) &&
												item.href !== "/dashboard");
										const showBadge = item.id === "housekeeping";
										const isLocked =
											item.minPlan &&
											currentLevel < (planLevel[item.minPlan] ?? 0);

										if (isLocked) {
											return (
												<div
													key={item.id}
													className="block group relative"
													title="Disponible en Enterprise"
												>
													<NavButton
														icon={
															<Lock className="size-4 stroke-[1.5] text-muted-foreground/40" />
														}
														label={item.label}
														active={false}
													/>
													<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/30 font-mono tracking-wider">
														PRO
													</span>
												</div>
											);
										}

										return (
											<Link
												key={item.id}
												href={item.href}
												className="block group relative"
											>
												<NavButton
													icon={
														<item.icon
															className={cn(
																"size-4.5 stroke-[1.5]",
																isActive
																	? "text-brand-400"
																	: "text-muted-foreground group-hover:text-sidebar-foreground",
															)}
														/>
													}
													label={item.label}
													active={isActive}
												/>
												{showBadge && (
													<span
														className="absolute right-4 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"
														aria-hidden="true"
													/>
												)}
											</Link>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
			</nav>

			{/* Acciones de Sistema */}
			<div className="p-6 border-t border-border space-y-1">
				<button
					onClick={onOpenShiftModal}
					className="flex items-center gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-accent transition-all text-xs font-semibold w-full px-4 py-3 rounded-[var(--radius-squircle-lg)] group"
				>
					<Calculator className="size-4.5 stroke-[1.5] text-success/70 group-hover:text-success" />
					Cierre de Turno
				</button>

				<button
					onClick={onLogout}
					className="flex items-center gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/5 transition-all text-xs font-semibold w-full px-4 py-3 rounded-[var(--radius-squircle-lg)] group"
				>
					<LogOut className="size-4.5 stroke-[1.5] group-hover:translate-x-1 transition-transform" />
					Finalizar Sesión
				</button>
			</div>
		</aside>
	);
};

export default function Sidebar({
	hotelName = "HospedaSuite",
	hotelId = "",
	myHotels = [],
	
	user,
	subscriptionPlan = "starter",
	staffIdentity,
}: SidebarProps) {
	const pathname = usePathname();
	const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

	const handleLogout = async () => {
		try {
			// Si hay usuario de Supabase (admin), logout global
			// Si no, es staff — logout solo de cookie operativa
			if (user) {
				await logout();
			} else {
				await logoutStaff();
			}
		} catch (error) {
			console.error("Error durante la terminación de sesión:", error);
		}
	};

	return (
		<>
			<SidebarView
				hotelName={hotelName}
				hotelId={hotelId}
				myHotels={myHotels}
				user={user}
				staffIdentity={staffIdentity}
				currentPath={pathname}
				subscriptionPlan={subscriptionPlan}
				onLogout={handleLogout}
				onOpenShiftModal={() => setIsShiftModalOpen(true)}
			/>

			<ShiftReportModal
				isOpen={isShiftModalOpen}
				onClose={() => setIsShiftModalOpen(false)}
			/>
		</>
	);
}
