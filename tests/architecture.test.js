// Testes de arquitetura do frontend: independência dos microfrontends e acesso só pelo BFF.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';

const SRC = resolve(import.meta.dirname, '../src');
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const files = walk(SRC).filter((f) => /\.(js|jsx)$/.test(f)).map((abs) => {
  const source = readFileSync(abs, 'utf8');
  const imports = [...source.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)]
    .map((m) => m[1] || m[2])
    .map((s) => (s.startsWith('.') ? relative(SRC, resolve(dirname(abs), s)).split(sep).join('/') : s));
  return { file: relative(SRC, abs).split(sep).join('/'), source, imports };
});
const area = (p) => p.split('/')[0];

test('um microfrontend não importa outro microfrontend nem o shell', () => {
  for (const { file, imports } of files.filter((f) => area(f.file).startsWith('mf-'))) {
    for (const imp of imports.filter((i) => !['react', 'react-dom/client', 'react/jsx-runtime'].includes(i))) {
      assert.ok([area(file), 'shared'].includes(area(imp)), `${file} importa ${imp}`);
    }
  }
});

test('o shell carrega os microfrontends só em tempo de execução (sem import estático)', () => {
  for (const { file, imports } of files.filter((f) => area(f.file) === 'shell')) {
    assert.ok(!imports.some((i) => area(i).startsWith('mf-')), `${file} importa um microfrontend diretamente`);
  }
});

test('somente shell/api.js faz requisições HTTP (o frontend fala apenas com o BFF)', () => {
  const callers = files.filter((f) => /\bfetch\s*\(/.test(f.source)).map((f) => f.file);
  assert.deepEqual(callers, ['shell/api.js']);
});

test('nenhum endereço de microserviço ou Function aparece no frontend', () => {
  for (const { file, source } of files) {
    assert.ok(!/:300[12]\b|:7071\b|azurewebsites\.net|azurecontainerapps\.io/.test(source), `${file} referencia um serviço interno`);
  }
});

test('cada microfrontend exporta o contrato mount(elemento, contexto)', () => {
  for (const mf of ['mf-agenda', 'mf-prontuario']) {
    const index = files.find((f) => f.file === `${mf}/index.jsx`);
    assert.ok(index, `${mf}/index.jsx não existe`);
    assert.match(index.source, /export function mount\(element, ctx\)/);
  }
});
