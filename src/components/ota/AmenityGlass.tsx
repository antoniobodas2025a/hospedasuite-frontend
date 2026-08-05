import React from "react";

interface AmenityGlassProps {
	icon: React.ElementType;
	title: string;
	story: string;
	compact?: boolean;
}

export function AmenityGlass({
	icon: Icon,
	title,
	story,
	compact,
}: AmenityGlassProps) {
	if (compact) {
		return (
			<div className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-brand-500/5 to-warm-400/5 border border-brand-500/10 transition-all hover:from-brand-500/10 hover:to-warm-400/10">
				<Icon size={20} className="text-brand-500" strokeWidth={1.5} />
				<p className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-1">
					{title}
				</p>
			</div>
		);
	}
	return (
		<div className="group flex gap-3 p-3 rounded-[var(--radius-squircle-lg)] transition-all duration-300 hover:bg-white/40 hover:shadow-md hover:shadow-brand-500/5">
			<div className="shrink-0 size-10 rounded-[var(--radius-squircle-lg)] bg-gradient-to-br from-brand-500/10 to-warm-400/10 border border-brand-500/15 flex items-center justify-center transition-all group-hover:from-brand-500/20 group-hover:to-warm-400/20 group-hover:scale-105">
				<Icon size={18} className="text-brand-500" strokeWidth={1.5} />
			</div>
			<div>
				<p className="text-sm font-semibold text-foreground">{title}</p>
				<p className="text-[11px] text-muted-foreground leading-relaxed font-lora">
					{story}
				</p>
			</div>
		</div>
	);
}
