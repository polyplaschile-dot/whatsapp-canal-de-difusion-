import { createClient } from '@supabase/supabase-js';

// Credenciales desde GitHub Secrets
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.CHANNEL_ID;
const TEST_PHONE = process.env.TEST_PHONE;

async function main() {
  console.log('🔍 Buscando oferta del día...');

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
      name: 'oferta_vip_clientes',
      language: { code: 'es' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: data.producto },
            { type: 'text', text: `${data.precio_original}` },
            { type: 'text', text: `${data.precio_oferta}` },
            { type: 'text', text: data.link_compra }
          ]
        }
      ]
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
