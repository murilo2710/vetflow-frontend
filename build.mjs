// Build do microfrontend com esbuild.
//  - vendor/   React compartilhado por todos (via import map no index.html), como o "shared" do Module Federation
//  - shell.js  aplicação container: layout, navegação, painel agregado e carregamento dos microfrontends
//  - mf/agenda/index.js e mf/prontuario/index.js: microfrontends independentes, carregados em tempo de execução
// Uso: node build.mjs            (gera dist/)
//      node build.mjs agenda     (gera só o microfrontend agenda: deploy independente)
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';

const only = process.argv[2];
const prod = process.env.NODE_ENV !== 'development';
const shared = ['react', 'react-dom/client', 'react/jsx-runtime'];
const common = {
  bundle: true,
  format: 'esm',
  target: 'es2020',
  minify: prod,
  sourcemap: !prod,
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.jsx': 'jsx' },
  define: { 'process.env.NODE_ENV': JSON.stringify(prod ? 'production' : 'development') },
  logLevel: 'info'
};

const remotes = {
  agenda: { entryPoints: ['src/mf-agenda/index.jsx'], outfile: 'dist/mf/agenda/index.js' },
  prontuario: { entryPoints: ['src/mf-prontuario/index.jsx'], outfile: 'dist/mf/prontuario/index.js' }
};

if (only && remotes[only]) {
  await build({ ...common, ...remotes[only], external: shared });
  process.exit(0);
}

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('public', 'dist', { recursive: true });

// config.js pode ser gerado no CI a partir da variável VETFLOW_API_URL (URL do API Gateway)
if (process.env.VETFLOW_API_URL) {
  const cfg = readFileSync('public/config.js', 'utf8')
    .replace(/apiUrl:\s*'[^']*'/, `apiUrl: '${process.env.VETFLOW_API_URL.replace(/\/+$/, '')}'`);
  writeFileSync('dist/config.js', cfg);
}

await build({
  ...common,
  entryPoints: {
    react: 'src/vendor/react.js',
    'react-dom-client': 'src/vendor/react-dom-client.js',
    'jsx-runtime': 'src/vendor/jsx-runtime.js'
  },
  outdir: 'dist/vendor',
  splitting: true,
  chunkNames: 'chunk-[hash]'
});
await build({ ...common, entryPoints: ['src/shell/main.jsx'], outfile: 'dist/shell.js', external: shared });
for (const remote of Object.values(remotes)) await build({ ...common, ...remote, external: shared });
console.log('Build concluído em dist/');
