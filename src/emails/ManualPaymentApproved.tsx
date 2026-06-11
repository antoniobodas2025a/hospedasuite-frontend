import { Html, Head, Body, Container, Section, Text, Heading, Link, Button } from '@react-email/components';
import * as React from 'react';

interface ManualPaymentApprovedProps {
  hotelName: string;
  amount: number;
  method: string;
  approvedAt: string;
  dashboardUrl: string;
}

export const ManualPaymentApproved = ({ hotelName, amount, method, approvedAt, dashboardUrl }: ManualPaymentApprovedProps) => (
  <Html>
    <Head />
    <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
      <Container style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '40px', marginTop: '20px', maxWidth: '600px' }}>
        <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>
          ¡Pago Verificado!
        </Heading>
        <Text style={{ fontSize: '16px', color: '#4b5563' }}>
          Tu pago para <strong>{hotelName}</strong> ha sido verificado exitosamente.
        </Text>
        
        <Section style={{ margin: '24px 0', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <Text style={{ margin: '0 0 10px 0', color: '#166534' }}>
            <strong>Monto:</strong> ${amount.toLocaleString('es-CO')} COP
          </Text>
          <Text style={{ margin: '0 0 10px 0', color: '#166534' }}>
            <strong>Método:</strong> {method}
          </Text>
          <Text style={{ margin: '0', color: '#166534' }}>
            <strong>Verificado el:</strong> {approvedAt}
          </Text>
        </Section>

        <Text style={{ fontSize: '14px', color: '#4b5563' }}>
          Tu propiedad ya está completamente activa. Podés recibir reservas y gestionar tu hotel desde el dashboard.
        </Text>

        <Section style={{ marginTop: '30px', textAlign: 'center' }}>
          <Link href={dashboardUrl} style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}>
            Ir al Dashboard
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
