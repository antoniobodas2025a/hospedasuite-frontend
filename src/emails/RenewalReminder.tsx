import { Html, Head, Body, Container, Section, Text, Heading, Button } from '@react-email/components';
import * as React from 'react';

interface RenewalReminderProps {
  hotelName: string;
  planLabel: string;
  amount: number;
  paymentUrl: string;
  periodEnd: Date;
}

export const RenewalReminder = ({ hotelName, planLabel, amount, paymentUrl, periodEnd }: RenewalReminderProps) => {
  const formattedDate = periodEnd.toLocaleDateString('es-CO', { 
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const formattedAmount = amount.toLocaleString('es-CO');
  
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '40px', marginTop: '20px', maxWidth: '600px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>
            Recordatorio de Renovación
          </Heading>
          
          <Text style={{ fontSize: '16px', color: '#4b5563' }}>
            Hola <strong>{hotelName}</strong>,
          </Text>
          
          <Text style={{ fontSize: '16px', color: '#4b5563' }}>
            Tu suscripción a HospedaSuite ({planLabel}) vence el <strong>{formattedDate}</strong>.
          </Text>
          
          <Section style={{ margin: '24px 0', padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
            <Text style={{ margin: '0 0 10px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Plan:</strong> {planLabel}
            </Text>
            <Text style={{ margin: '0 0 10px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Monto:</strong> ${formattedAmount} COP
            </Text>
            <Text style={{ margin: '0', color: '#374151', fontSize: '14px' }}>
              <strong>Fecha de vencimiento:</strong> {formattedDate}
            </Text>
          </Section>
          
          <Section style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button 
              href={paymentUrl} 
              style={{ 
                backgroundColor: '#10b981', 
                color: '#ffffff', 
                padding: '14px 28px', 
                borderRadius: '6px', 
                textDecoration: 'none', 
                fontWeight: 'bold', 
                display: 'inline-block',
                fontSize: '16px'
              }}
            >
              Pagar ahora
            </Button>
          </Section>
          
          <Text style={{ fontSize: '14px', color: '#6b7280', marginTop: '20px' }}>
            Si ya realizaste el pago, puedes ignorar este email.
          </Text>
          
          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>
            ¿Necesitas ayuda? Escríbenos a soporte@hospedasuite.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default RenewalReminder;
