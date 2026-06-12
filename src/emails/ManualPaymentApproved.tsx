import { Html, Head, Body, Container, Section, Text, Heading, Link, Button } from '@react-email/components';
import * as React from 'react';

interface ManualPaymentApprovedProps {
  hotelName: string;
  guestName: string;
  bookingId: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  voucherUrl: string;
}

export const ManualPaymentApproved = ({
  hotelName,
  guestName,
  bookingId,
  checkIn,
  checkOut,
  totalAmount,
  voucherUrl,
}: ManualPaymentApprovedProps) => (
  <Html>
    <Head />
    <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
      <Container style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '40px', marginTop: '20px', maxWidth: '600px' }}>
        <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>
          ¡Pago Verificado!
        </Heading>
        <Text style={{ fontSize: '16px', color: '#4b5563' }}>
          Hola {guestName}, tu reserva en <strong>{hotelName}</strong> ha sido confirmada.
        </Text>
        
        <Section style={{ margin: '24px 0', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <Text style={{ margin: '0 0 10px 0', color: '#166534' }}>
            <strong>Reserva:</strong> #{bookingId}
          </Text>
          <Text style={{ margin: '0 0 10px 0', color: '#166534' }}>
            <strong>Check-in:</strong> {checkIn}
          </Text>
          <Text style={{ margin: '0 0 10px 0', color: '#166534' }}>
            <strong>Check-out:</strong> {checkOut}
          </Text>
          <Text style={{ margin: '0', color: '#166534' }}>
            <strong>Total pagado:</strong> ${totalAmount.toLocaleString('es-CO')} COP
          </Text>
        </Section>

        <Text style={{ fontSize: '14px', color: '#4b5563' }}>
          Tu Motor de Reservas Propio ha procesado tu pago exitosamente. 
          Presenta este correo o tu voucher al llegar.
        </Text>

        <Section style={{ marginTop: '30px', textAlign: 'center' }}>
          <Link href={voucherUrl} style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}>
            Ver mi Voucher
          </Link>
        </Section>
        
        <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>
          HospedaSuite · Motor de Reservas Propio
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ManualPaymentApproved;
