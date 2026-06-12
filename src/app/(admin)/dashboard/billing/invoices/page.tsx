import { getCurrentHotel } from '@/lib/hotel-context';
import { getInvoiceHistoryAction } from '@/app/actions/billing';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Check, Clock, AlertTriangle, X } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Check; color: string; bg: string }> = {
  paid: { label: 'Pagada', icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  pending: { label: 'Pendiente', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  overdue: { label: 'Vencida', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  cancelled: { label: 'Cancelada', icon: X, color: 'text-muted-foreground', bg: 'bg-muted' },
};

const formatCOP = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

export default async function InvoiceHistoryPage() {
  const hotel = await getCurrentHotel();

  if (!hotel) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-muted-foreground font-medium">
        No se encontró información del hotel.
      </div>
    );
  }

  const { success, invoices, error } = await getInvoiceHistoryAction(hotel.id);

  return (
    <div className="h-full space-y-[var(--space-breath)]">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/billing"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-sidebar-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Volver a Facturación
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-sidebar-foreground">
          Historial de Facturas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Todas tus facturas emitidas y su estado de pago.
        </p>
      </div>

      {/* Invoice List */}
      {!success || error ? (
        <div className="glass-card p-8 rounded-[var(--radius-squircle-3xl)] border border-border text-center text-muted-foreground">
          Error cargando el historial: {error}
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <div className="glass-card p-8 rounded-[var(--radius-squircle-3xl)] border border-border text-center">
          <CreditCard className="mx-auto size-12 text-muted-foreground mb-4" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-sidebar-foreground">Sin facturas aún</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tu primera factura se generará al finalizar tu período de prueba.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const status = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.pending;
            const StatusIcon = status.icon;

            return (
              <div
                key={invoice.id}
                className="glass-card p-5 rounded-[var(--radius-squircle-2xl)] border border-border"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Period + Status */}
                  <div className="flex items-center gap-4">
                    <div className={`size-10 rounded-full ${status.bg} flex items-center justify-center`}>
                      <StatusIcon className={`size-5 ${status.color}`} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-sidebar-foreground">
                        {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ref: {invoice.wompiReference || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount + Status Badge */}
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-bold text-sidebar-foreground">
                      {formatCOP(invoice.total)}
                    </p>
                    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Breakdown (collapsible detail) */}
                <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="ml-2 text-sidebar-foreground font-medium">
                      {formatCOP(invoice.planFee)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Comisiones Channel:</span>
                    <span className="ml-2 text-sidebar-foreground font-medium">
                      {formatCOP(invoice.otaCommissions)}
                    </span>
                  </div>
                </div>

                {invoice.paidAt && (
                  <p className="text-[11px] text-muted-foreground/60 mt-2">
                    Pagado el {formatDate(invoice.paidAt)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
