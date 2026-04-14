// test-webhook.ts
const crypto = require('crypto');

const SECRET = "tu_secreto_de_eventos_aqui"; // Debe coincidir con tu .env
const ENDPOINT = "http://localhost:3000/api/wompi/webhook"; // Cambia por tu URL de Vercel para pruebas remotas

const testData = {
  event: "transaction.updated",
  data: {
    transaction: {
      id: "TEST_TX_" + Date.now(),
      status: "APPROVED",
      amount_in_cents: 15000000, // 150,000 COP
      reference: "AQUI_EL_ID_DE_UNA_RESERVA_REAL_EN_TU_BD"
    }
  },
  timestamp: Math.floor(Date.now() / 1000)
};

const tx = testData.data.transaction;
const stringToHash = `${tx.id}${tx.status}${tx.amount_in_cents}${testData.timestamp}${SECRET}`;
const checksum = crypto.createHash('sha256').update(stringToHash).digest('hex');

const payload = {
  ...testData,
  signature: { checksum }
};

console.log("🚀 Enviando Webhook de Prueba...");
fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log("📡 Respuesta del Servidor:", data))
.catch(err => console.error("❌ Error:", err));