import { Html, Head, Body, Container, Section, Text, Heading, Link } from '@react-email/components';
import * as React from 'react';

interface VoucherProps {
  guestName: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  roomName: string;
  reference: string;
  total: number;
}

export const BookingVoucher = ({ guestName, hotelName, checkIn, checkOut, roomName, reference, total }: VoucherProps) => (
  <Html>
    <Head />
    <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
      <Container style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '40px', marginTop: '20px', maxWidth: '600px' }}>
        <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>
          ¡Reserva Confirmada!
        </Heading>
        <Text style={{ fontSize: '16px', color: '#4b5563' }}>
          Hola <strong>{guestName}</strong>, tu estadía en <strong>{hotelName}</strong> está garantizada.
        </Text>
        
        <Section style={{ margin: '24px 0', padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <Text style={{ margin: '0 0 10px 0', color: '#374151' }}><strong>ID de Reserva:</strong> {reference}</Text>
          <Text style={{ margin: '0 0 10px 0', color: '#374151' }}><strong>Alojamiento:</strong> {roomName}</Text>
          <Text style={{ margin: '0 0 10px 0', color: '#374151' }}><strong>Check-in:</strong> {checkIn}</Text>
          <Text style={{ margin: '0', color: '#374151' }}><strong>Check-out:</strong> {checkOut}</Text>
        </Section>

        <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', textAlign: 'right' }}>
          Total Pagado: ${total.toLocaleString('es-CO')} COP
        </Text>
        
        <Section style={{ marginTop: '30px', textAlign: 'center' }}>
          <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/mis-reservas`} style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}>
            Gestionar mi Reserva
          </Link>
        </Section>
        
        <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>
          Este pago fue procesado de forma segura por Wompi y HospedaSuite.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default BookingVoucher;