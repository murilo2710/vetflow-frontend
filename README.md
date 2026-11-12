# VetFlow · Microfrontend (React)

Interface do VetFlow em **React**, organizada como **microfrontends**:

| Parte | Responsabilidade | Build |
|---|---|---|
| **shell** | Layout, navegação, **Painel** (consome `GET /aggregated-data`), painel "Chamadas ao BFF" e carregamento dos microfrontends | `dist/shell.js` |
| **mf-agenda** | Agenda de consultas: agendar, pagar/confirmar, reagendar, cancelar, excluir, eventos e notificações | `dist/mf/agenda/index.js` |
| **mf-prontuario** | Pets e prontuário: CRUD de pets e registro de atendimentos | `dist/mf/prontuario/index.js` |

- Cada microfrontend é um **ES module independente**, carregado pelo shell **em tempo de execução** (`import()` da URL configurada em `config.js`) e pode ser publicado em outro endereço sem rebuild do shell.
- Contrato entre shell e microfrontend: `mount(elemento, { api, notify, dataChanged })` devolve `unmount()`.
- O **React é compartilhado** por um *import map* (`vendor/`), equivalente ao `shared` do Module Federation.
- O frontend **só fala com o BFF** (pelo API Gateway): o único `fetch` está em `src/shell/api.js`, o que é verificado por teste de arquitetura.

**Alunos:** Bernardo Vieira · Murilo Regnier
PUCPR · Engenharia de Software · Arquitetura e Soluções Cloud · PJBL Entrega 3

## Link (nuvem)
`https://<usuario-github>.github.io/vetflow-frontend/`

## Tecnologias
React 19, esbuild, import maps / ES modules, GitHub Pages (GitHub Actions), `node:test`.

## Como rodar localmente
```bash
npm install
npm test
npm start                 # build + servidor em http://localhost:5173
```
A URL do BFF/API Gateway fica em `public/config.js` (`apiUrl`). No GitHub Pages ela vem da variável de repositório `VETFLOW_API_URL`.

## Deploy (GitHub Pages)
1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → **Variables** → `VETFLOW_API_URL` = URL do API Gateway (ex.: `https://vetflow-apim.azure-api.net/vetflow`).
3. Rodar o workflow **Testes e deploy no GitHub Pages** (ou fazer push na `main`).

Para publicar só um microfrontend: `npm run build:agenda` (gera `dist/mf/agenda/index.js`).
