#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * ============================================================================
 * DEPLOY-KLAVIYO.JS — Orquestador de Flujos B2B (Dark Funnel Harvest)
 *
 * Este script automatiza la creación de Flujos y Plantillas en Klaviyo
 * basándose en la configuración definida en src/lib/klaviyo-templates.json.
 *
 * Uso: node scripts/deploy-klaviyo.js
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// --- Configuración ---
const API_KEY = process.env.KLAVIYO_API_KEY;
const LIST_ID = process.env.KLAVIYO_LIST_ID;
const TEMPLATES_PATH = path.resolve(__dirname, '../src/lib/klaviyo-templates.json');

if (!API_KEY || !LIST_ID) {
  console.error('❌ Error: Faltan KLAVIYO_API_KEY o KLAVIYO_LIST_ID en .env.local');
  process.exit(1);
}

const HEADERS = {
  accept: 'application/json',
  'content-type': 'application/json',
  Authorization: `Klaviyo-API-Key ${API_KEY}`,
  revision: '2023-02-22',
};

// --- Funciones Auxiliares ---
async function apiCall(endpoint, method, body) {
  const url = `https://a.klaviyo.com/api${endpoint}`;
  const options = { method, headers: HEADERS };
  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`API Error ${response.status}: ${JSON.stringify(data)}`);
    }
    return data;
  } catch (error) {
    console.error(`❌ Fallo en llamada a ${endpoint}:`, error.message);
    throw error;
  }
}

async function listFlows() {
  const result = await apiCall('/flows?filter=equals(status,"manual")', 'GET');
  return result.data || [];
}

async function listTemplates() {
  const result = await apiCall('/templates', 'GET');
  return result.data || [];
}

async function createFlow(name) {
  console.log(`🚀 Creando Flujo: ${name}...`);
  const payload = {
    data: {
      type: 'flow',
      attributes: {
        name: name,
        status: 'manual',
      },
    },
  };
  const result = await apiCall('/flows', 'POST', payload);
  console.log(`✅ Flujo creado con ID: ${result.data.id}`);
  return result.data.id;
}

async function createTemplate(name, subject, html, text) {
  console.log(`📄 Creando Plantilla: ${name}...`);
  const payload = {
    data: {
      type: 'template',
      attributes: {
        name: name,
        editor_type: 'code',
        html: html,
        text: text || '',
        subject: subject,
      },
    },
  };
  const result = await apiCall('/templates', 'POST', payload);
  console.log(`✅ Plantilla creada con ID: ${result.data.id}`);
  return result.data.id;
}

// --- Ejecución Principal ---
async function main() {
  console.log('🕵️ Iniciando Despliegue Agéntico de Klaviyo...');

  try {
    const config = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8'));
    const flows = config.flows;

    // Idempotencia: verificar flujos y plantillas existentes
    console.log('\n📋 Verificando estado actual...');
    const existingFlows = await listFlows();
    const existingTemplates = await listTemplates();

    const existingFlowNames = new Set(
      existingFlows.map((f) => f.attributes?.name)
    );
    const existingTemplateNames = new Set(
      existingTemplates.map((t) => t.attributes?.name)
    );

    for (const flowConfig of Object.values(flows)) {
      console.log(`\n--- Procesando Flujo: ${flowConfig.id} ---`);

      // 1. Crear el contenedor del Flujo (solo si no existe)
      if (existingFlowNames.has(flowConfig.id)) {
        console.log(`⏭️ Flujo "${flowConfig.id}" ya existe — saltando`);
      } else {
        await createFlow(flowConfig.id, 'metric');
      }

      // 2. Crear las Plantillas de Email asociadas (solo si no existen)
      for (const email of flowConfig.emails) {
        const templateName = `${flowConfig.id} - Email ${email.id}`;
        const textContent = email.body_html
          .replace(/<[^>]*>?/gm, '')
          .replace(/\n\s*\n/g, '\n');

        if (existingTemplateNames.has(templateName)) {
          console.log(`⏭️ Plantilla "${templateName}" ya existe — saltando`);
        } else {
          await createTemplate(
            templateName,
            email.subject,
            email.body_html,
            textContent
          );
        }
      }
    }

    console.log('\n🎉 Despliegue completado. Revisa tu dashboard de Klaviyo para activar los triggers.');
  } catch (error) {
    console.error('💥 El despliegue falló:', error);
    process.exit(1);
  }
}

main();
