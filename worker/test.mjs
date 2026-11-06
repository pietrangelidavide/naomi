// Prova del modulo di contatto senza rete: node worker/test.mjs
import assert from 'node:assert/strict';
import { handleContact } from './index.js';

const env = { RESEND_API_KEY: 're_test', CONTACT_TO: 'naomi@example.it', CONTACT_FROM: 'Sito <sito@example.it>' };
const post = (fields, headers = {}) => new Request('https://sito.test/api/contatti', {
  method: 'POST', headers: { Origin: 'https://sito.test', ...headers }, body: new URLSearchParams(fields)
});
const ok = { nome: 'Giulia Rossi', email: 'giulia@example.com', telefono: '', messaggio: 'Vorrei una consulenza online.', consenso: 'on', sito: '' };
const loc = (r) => new URL(r.headers.get('location')).hash;
let calls = [];
const okFetch = async (url, init) => { calls.push({ url, init }); return new Response('{"id":"1"}', { status: 200 }); };

// invio riuscito
let r = await handleContact(post(ok), env, okFetch);
assert.equal(r.status, 303); assert.equal(loc(r), '#inviato');
assert.equal(calls.length, 1);
const sent = JSON.parse(calls[0].init.body);
assert.equal(calls[0].url, 'https://api.resend.com/emails');
assert.equal(calls[0].init.headers.Authorization, 'Bearer re_test');
assert.deepEqual(sent.to, ['naomi@example.it']); assert.equal(sent.reply_to, 'giulia@example.com');
assert.match(sent.text, /Vorrei una consulenza online\./);

// header injection: gli a capo nel nome non finiscono nell'oggetto
calls = [];
r = await handleContact(post({ ...ok, nome: 'Mario\r\nBcc: spia@example.com' }), env, okFetch);
assert.equal(loc(r), '#inviato'); assert.ok(!/[\r\n]/.test(JSON.parse(calls[0].init.body).subject));

// bot: campo trappola compilato → finta conferma, nessun invio
calls = [];
r = await handleContact(post({ ...ok, sito: 'http://spam' }), env, okFetch);
assert.equal(loc(r), '#inviato'); assert.equal(calls.length, 0);

// dati non validi → #errore, nessun invio
for (const bad of [{ nome: '' }, { email: 'non-una-email' }, { messaggio: 'ok' }, { consenso: '' }]) {
  r = await handleContact(post({ ...ok, ...bad }), env, okFetch);
  assert.equal(loc(r), '#errore', JSON.stringify(bad));
}
assert.equal(calls.length, 0);

// segreti mancanti, Resend che rifiuta, rete che cade → #errore
r = await handleContact(post(ok), {}, okFetch); assert.equal(loc(r), '#errore');
r = await handleContact(post(ok), env, async () => new Response('no', { status: 422 })); assert.equal(loc(r), '#errore');
r = await handleContact(post(ok), env, async () => { throw new Error('rete'); }); assert.equal(loc(r), '#errore');

// altro sito di origine, metodo sbagliato
r = await handleContact(post(ok, { Origin: 'https://altro.example' }), env, okFetch); assert.equal(r.status, 403);
r = await handleContact(new Request('https://sito.test/api/contatti'), env, okFetch); assert.equal(r.status, 405);

console.log('modulo di contatto: tutte le prove passate');
