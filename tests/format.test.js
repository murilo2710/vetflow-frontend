import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money, errorText, localInputToIso, STATUS_LABEL } from '../src/shared/format.js';
import { createApi } from '../src/shell/api.js';

test('money formata centavos em reais', () => {
  assert.match(money(15000), /R\$\s?150,00/);
  assert.match(money(null), /R\$\s?0,00/);
});

test('errorText junta mensagem e detalhes do padrão de erro do BFF', () => {
  const err = { body: { error: { message: 'Agendamento inválido', details: { startsAt: 'Antecedência de 2h' } } } };
  assert.equal(errorText(err), 'Agendamento inválido: Antecedência de 2h');
  assert.equal(errorText(new Error('x')), 'x');
});

test('localInputToIso converte o datetime-local para ISO', () => {
  assert.equal(localInputToIso(''), '');
  assert.ok(localInputToIso('2026-11-20T14:00').endsWith('Z'));
  assert.ok(STATUS_LABEL.CONFIRMED);
});

test('cliente do BFF registra cada chamada e transforma erro HTTP em exceção com o corpo', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => ({
    ok: false, status: 409,
    headers: { get: () => 'corr-1' },
    text: async () => JSON.stringify({ error: { code: 'conflict', message: 'Horário ocupado' } })
  });
  const api = createApi('https://gateway.exemplo/', (c) => calls.push(c));
  await assert.rejects(api.post('/appointments', {}), (e) => e.status === 409 && e.body.error.code === 'conflict');
  assert.equal(calls[0].url, 'https://gateway.exemplo/appointments');
  assert.equal(calls[0].correlationId, 'corr-1');
});
