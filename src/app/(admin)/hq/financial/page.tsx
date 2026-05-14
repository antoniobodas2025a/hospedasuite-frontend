import { getHQFinancialReportAction } from '@/app/actions/hq';
import Link from 'next/link';
import { ArrowLeft, Building2, TrendingUp, AlertTriangle, Check } from 'lucide-react';

export const dynamic = 'force-dynamic';

const formatCOP = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

export default async function HQFinancialPage() {
  const { success, report, kpis, error } = await getHQFinancialReportAction();

  if (!success || error) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-muted-foreground">
        Error: {error}
      </div>
    );
  }

  const totalHotels = kpis?.totalHotels || 0;
  const hotelsInTrial = report?.filter(h => h.subscription_plan === 'starter' && h.subscription_fee === 0).length || 0;
  const hotelsActive = report?.filter(h => h.subscription_fee > 0).length || 0;
  const grandTotal = kpis?.grandTotalExpected || 0;

  return (
    <div className="h-full space-y-[var(--space-breath)]">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-sidebar-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-sidebar-foreground">
          Panel Financiero HQ
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estado financiero de todos los hoteles — Vista de administrador.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--space-focus)]">
        <div className="glass-card p-6 rounded-[var(--radius-squircle-2xl)] border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Building2 className="size-5 text-blue-400" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Hoteles</p>
          </div>
          <p className="text-3xl font-semibold text-sidebar-foreground">{totalHotels}</p>
        </div>

        <div className="glass-card p-6 rounded-[var(--radius-squircle-2xl)] border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="size-5 text-emerald-400" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Activos</p>
          </div>
          <p className="text-3xl font-semibold text-sidebar-foreground">{hotelsActive}</p>
        </div>

        <div className="glass-card p-6 rounded-[var(--radius-squircle-2xl)] border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="size-5 text-amber-400" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">En Trial</p>
          </div>
          <p className="text-3xl font-semibold text-sidebar-foreground">{hotelsInTrial}</p>
        </div>

        <div className="glass-card p-6 rounded-[var(--radius-squircle-2xl)] border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-full bg-brand-500/10 flex items-center justify-center">
              <TrendingUp className="size-5 text-brand-400" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Revenue Esperado</p>
          </div>
          <p className="text-3xl font-semibold text-sidebar-foreground">{formatCOP(grandTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">Este mes</p>
        </div>
      </div>

      {/* Hotel Debt Table */}
      <div className="glass-card rounded-[var(--radius-squircle-3xl)] border border-border overflow-hidden">
        <div className="p-5 border-b border-border/50">
          <h2 className="text-lg font-semibold text-sidebar-foreground">
            Deuda por Hotel
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Ordenado por mayor deuda. Incluye suscripción + comisiones OTA.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Hotel</th>
                <th className="text-left p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Plan</th>
                <th className="text-right p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Suscripción</th>
                <th className="text-right p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Comisiones</th>
                <th className="text-right p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Total</th>
                <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Reservas</th>
              </tr>
            </thead>
            <tbody>
              {report?.map((hotel, i) => (
                <tr key={hotel.hotel_id} className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}`}>
                  <td className="p-4 font-medium text-sidebar-foreground">{hotel.hotel_name}</td>
                  <td className="p-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {hotel.subscription_plan}
                    </span>
                  </td>
                  <td className="p-4 text-right text-sidebar-foreground">{formatCOP(hotel.subscription_fee)}</td>
                  <td className="p-4 text-right text-sidebar-foreground">{formatCOP(hotel.accumulated_fees)}</td>
                  <td className="p-4 text-right font-bold text-brand-400">{formatCOP(hotel.total_debt)}</td>
                  <td className="p-4 text-center text-muted-foreground">{hotel.total_bookings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!report || report.length === 0) && (
          <div className="p-8 text-center text-muted-foreground">
            No hay hoteles registrados aún.
          </div>
        )}
      </div>
    </div>
  );
}
