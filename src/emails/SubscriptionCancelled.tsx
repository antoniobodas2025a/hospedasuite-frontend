import { Html, Head, Body, Container, Section, Text, Heading, Button } from '@react-email/components';
import * as React from 'react';

interface SubscriptionCancelledProps {
  hotelName: string;
  planLabel: string;
  periodEnd: Date;
  reactivateUrl: string;
}

export const SubscriptionCancelled = ({ hotelName, planLabel, periodEnd, reactivateUrl }: SubscriptionCancelledProps) => {
  const formattedDate = periodEnd.toLocaleDateString('es-CO', { 
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '40px', marginTop: '20px', maxWidth: '600px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', textAlign: 'center' }}>
            Suscripción Cancelada
          </Heading>
          
          <Text style={{ fontSize: '16px', color: '#4b5563' }}>
            Hola <strong>{hotelName}</strong>,
          </Text>
          
          <Text style={{ fontSize: '16px', color: '#4b5563' }}>
            Hemos recibido tu solicitud de cancelación de la suscripción a HospedaSuite ({planLabel}).
          </Text>
          
          <Section style={{ margin: '24px 0', padding: '20px', backgroundColor: '#dbeafe', borderRadius: '8px', border: '1px solid #93c5fd' }}>
            <Text style={{ margin: '0 0 10px 0', color: '#1e40af', fontSize: '14px', fontWeight: 'bold' }}>
              ℹ️ Acceso hasta el {formattedDate}
            </Text>
            <Text style={{ margin: '0', color: '#1e40af', fontSize: '14px' }}>
              Mantendrás acceso completo a todas las funcionalidades de tu plan hasta la fecha indicada. Después de esa fecha, tu cuenta pasará a modo de solo lectura.
            </Text>
          </Section>
          
          <Text style={{ fontSize: '16px', color: '#4b5563' }}>
            <strong>¿Qué pasará después?</strong>
          </Text>
          
          <ul style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
            <li>Tus datos y configuraciones se mantendrán guardados por 90 días</li>
            <li>Podrás reactivar tu suscripción en cualquier momento</li>
            <li>Después de 90 días, tus datos serán eliminados permanentemente</li>
          </ul>
          
          <Section style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button 
              href={reactivateUrl} 
              style={{ 
                backgroundColor: '#2563eb', 
                color: '#ffffff', 
                padding: '14px 28px', 
                borderRadius: '6px', 
                textDecoration: 'none', 
                fontWeight: 'bold', 
                display: 'inline-block',
                fontSize: '16px'
              }}
            >
              Reactivar suscripción
            </Button>
          </Section>
          
          <Text style={{ fontSize: '14px', color: '#6b7280', marginTop: '20px' }}>
            Si cambiaste de opinión o fue un error, puedes reactivar tu suscripción en cualquier momento antes de que termine el período actual.
          </Text>
          
          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>
            ¿Necesitas ayuda? Escríbenos a soporte@hospedasuite.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default SubscriptionCancelled;
