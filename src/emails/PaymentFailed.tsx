import { Html, Head, Body, Container, Section, Text, Heading, Button } from '@react-email/components';
import * as React from 'react';

interface PaymentFailedProps {
  hotelName: string;
  planLabel: string;
  amount: number;
  paymentUrl: string;
  failureReason?: string;
}

export const PaymentFailed = ({ hotelName, planLabel, amount, paymentUrl, failureReason }: PaymentFailedProps) => {
  const formattedAmount = amount.toLocaleString('es-CO');
  
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '40px', marginTop: '20px', maxWidth: '600px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', textAlign: 'center' }}>
            ⚠️ Pago Rechazado
          </Heading>
          
          <Text style={{ fontSize: '16px', color: '#4b5563' }}>
            Hola <strong>{hotelName}</strong>,
          </Text>
          
          <Text style={{ fontSize: '16px', color: '#4b5563' }}>
            No pudimos procesar el pago de tu suscripción a HospedaSuite ({planLabel}).
          </Text>
          
          {failureReason && (
            <Section style={{ margin: '16px 0', padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <Text style={{ margin: '0', color: '#991b1b', fontSize: '14px' }}>
                <strong>Razón:</strong> {failureReason}
              </Text>
            </Section>
          )}
          
          <Section style={{ margin: '24px 0', padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
            <Text style={{ margin: '0 0 10px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Plan:</strong> {planLabel}
            </Text>
            <Text style={{ margin: '0', color: '#374151', fontSize: '14px' }}>
              <strong>Monto:</strong> ${formattedAmount} COP
            </Text>
          </Section>
          
          <Text style={{ fontSize: '16px', color: '#4b5563' }}>
            Para evitar la interrupción de tu servicio, por favor intenta pagar nuevamente:
          </Text>
          
          <Section style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button 
              href={paymentUrl} 
              style={{ 
                backgroundColor: '#dc2626', 
                color: '#ffffff', 
                padding: '14px 28px', 
                borderRadius: '6px', 
                textDecoration: 'none', 
                fontWeight: 'bold', 
                display: 'inline-block',
                fontSize: '16px'
              }}
            >
              Intentar pago nuevamente
            </Button>
          </Section>
          
          <Section style={{ margin: '24px 0', padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
            <Text style={{ margin: '0', color: '#92400e', fontSize: '14px' }}>
              <strong>⚠️ Importante:</strong> Si el pago no se realiza en los próximos 7 días, tu suscripción será suspendida temporalmente.
            </Text>
          </Section>
          
          <Text style={{ fontSize: '14px', color: '#6b7280', marginTop: '20px' }}>
            Si tienes problemas con el pago, contáctanos y te ayudaremos a encontrar una solución.
          </Text>
          
          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>
            ¿Necesitas ayuda? Escríbenos a soporte@hospedasuite.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PaymentFailed;
