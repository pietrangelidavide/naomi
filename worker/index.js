// Worker del sito: gestisce solo il modulo di contatto (POST /api/contatti).
// Tutto il resto (pagine, immagini, font) lo serve Cloudflare direttamente dalla cartella public/.
//
// Variabili segrete da impostare su Cloudflare (Workers → naomi-acciaro → Settings → Variables and Secrets):
//   RESEND_API_KEY  chiave API di Resend (resend.com)
//   CONTACT_TO      indirizzo che riceve i messaggi (es. l'email professionale di Naomi)
//   CONTACT_FROM    mittente su un dominio verificato in Resend, es. "Sito Naomi Acciaro <sito@dominio.it>"
//
// Il modulo è un normale <form method="post">, senza JavaScript: dopo l'invio si torna su
// /contatti#inviato (tutto bene) oppure /contatti#errore (qualcosa è andato storto).

const MAX = { nome: 120, email: 200, telefono: 40, messaggio: 4000 };
const clean = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);
const oneLine = (v) => v.replace(/[\r\n\t]+/g, ' ');
const emailOk = (v) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(v);
const back = (request, hash) => Response.redirect(new URL('/contatti' + hash, request.url).href, 303);

export async function handleContact(request, env, fetchImpl = fetch) {
  if (request.method !== 'POST') return new Response('Metodo non consentito', { status: 405, headers: { Allow: 'POST' } });

  // accetta solo invii partiti da questo stesso sito
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return new Response('Origine non consentita', { status: 403 });

  let form;
  try { form = await request.formData(); } catch { return back(request, '#errore'); }

  // campo trappola per i bot: le persone non lo vedono e non lo compilano
  if (clean(form.get('sito'), 50)) return back(request, '#inviato');

  const nome = clean(form.get('nome'), MAX.nome);
  const email = clean(form.get('email'), MAX.email);
  const telefono = clean(form.get('telefono'), MAX.telefono);
  const messaggio = clean(form.get('messaggio'), MAX.messaggio);
  if (!nome || !emailOk(email) || messaggio.length < 5 || !form.get('consenso')) return back(request, '#errore');

  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    console.error('Modulo contatti: mancano RESEND_API_KEY, CONTACT_TO o CONTACT_FROM');
    return back(request, '#errore');
  }

  const text = [
    'Nuovo messaggio dal modulo di contatto del sito.',
    '',
    `Nome e cognome: ${oneLine(nome)}`,
    `Email: ${email}`,
    `Telefono: ${telefono ? oneLine(telefono) : '(non indicato)'}`,
    '',
    'Messaggio:',
    messaggio,
    '',
    '—',
    'Consenso alla privacy policy: sì. Per rispondere basta usare «Rispondi»: il messaggio va a chi ha scritto.'
  ].join('\n');

  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.CONTACT_FROM, to: [env.CONTACT_TO], reply_to: email, subject: `Messaggio dal sito: ${oneLine(nome)}`.slice(0, 150), text })
    });
    if (!res.ok) { console.error('Resend ha risposto', res.status, await res.text().catch(() => '')); return back(request, '#errore'); }
  } catch (e) {
    console.error('Invio non riuscito', e);
    return back(request, '#errore');
  }
  return back(request, '#inviato');
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/contatti') return handleContact(request, env);
    return env.ASSETS.fetch(request);
  }
};
