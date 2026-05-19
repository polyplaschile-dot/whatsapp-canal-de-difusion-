import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Credenciales desde GitHub Secrets
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  { global: { fetch }, realtime: { transport: ws } }
);

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.CHANNEL_ID;
const TEST_PHONE = process.env.TEST_PHONE;

async function main() {
  console.log('🔍 Buscando oferta del día...');
  console.log('📅 Fecha buscada:', hoy);
console.log('🔗 URL Supabase:', process.env.SUPABASE_URL?.substring(0, 30));

  const hoy = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ofertas')
    .select('*')
    .eq('fecha_programada', hoy)
    .eq('enviado', false)
    .limit(1)
    .single();

  if (error || !data) {
    console.log('⚠️ No hay oferta programada para hoy.');
    process.exit(0);
  }

  console.log(`✅ Oferta encontrada: ${data.producto}`);

  const payload = {
    messaging_product: 'whatsapp',
    to: TEST_PHONE,
    type: 'template',
    template: {
      name: 'hello_world',
      language: { code: 'en_US' }
    }
  };

  console.log('📤 Enviando mensaje a WhatsApp...');

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  const result = await response.json();

  if (response.ok) {
    console.log('✅ Mensaje enviado correctamente:', result);

    await supabase
      .from('ofertas')
      .update({ enviado: true })
      .eq('id', data.id);

    console.log('✅ Oferta marcada como enviada en Supabase.');
  } else {
    console.error('❌ Error al enviar:', result);
    process.exit(1);
  }
}

main();
