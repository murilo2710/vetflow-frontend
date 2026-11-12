import { useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createApi } from './api.js';
import { Dashboard } from './Dashboard.jsx';
import { MicroFrontend } from './MicroFrontend.jsx';

const config = window.VETFLOW_CONFIG ?? {};
const TABS = [
  { id: 'painel', label: 'Painel' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'prontuario', label: 'Pets e Prontuário' },
  { id: 'arquitetura', label: 'Arquitetura' }
];

function App() {
  const [tab, setTab] = useState(() => location.hash.replace('#', '') || 'painel');
  const [calls, setCalls] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const onHash = () => setTab(location.hash.replace('#', '') || 'painel');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const api = useMemo(() => createApi(config.apiUrl || 'http://localhost:3000', (call) => {
    setCalls((prev) => [call, ...prev].slice(0, 30));
  }), []);

  // Contexto entregue aos microfrontends: o cliente do BFF e um canal de avisos.
  const context = useMemo(() => ({
    api,
    notify: (message, type = 'ok') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    },
    dataChanged: () => window.dispatchEvent(new CustomEvent('vetflow:data-changed'))
  }), [api]);

  const go = (id) => { location.hash = id; };

  return (
    <div className="layout">
      <header>
        <div className="brand">🐾 VetFlow <span className="muted small">clínicas veterinárias</span></div>
        <nav>
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => go(t.id)}>{t.label}</button>
          ))}
        </nav>
        <div className="muted small api-url" title="Todas as chamadas vão para o BFF pelo API Gateway">BFF: {api.baseUrl}</div>
      </header>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <main>
        <div className="content">
          {tab === 'painel' && <Dashboard api={api} />}
          {tab === 'agenda' && <MicroFrontend name="agenda" url={config.microfrontends?.agenda ?? './mf/agenda/index.js'} context={context} />}
          {tab === 'prontuario' && <MicroFrontend name="prontuario" url={config.microfrontends?.prontuario ?? './mf/prontuario/index.js'} context={context} />}
          {tab === 'arquitetura' && <Architecture api={api} />}
        </div>
        <aside className="calls">
          <h4>Chamadas ao BFF</h4>
          <p className="muted small">O frontend só fala com o BFF.</p>
          {calls.length === 0 && <p className="muted small">Nenhuma chamada ainda.</p>}
          <ul>
            {calls.map((c, i) => (
              <li key={i} className={c.status >= 400 || c.status === 0 ? 'fail' : 'ok'}>
                <span className="method">{c.method}</span> <span className="path">{c.path}</span>
                <div className="small muted">{c.status || 'falhou'} · {c.ms} ms{c.correlationId ? ` · ${c.correlationId.slice(0, 8)}` : ''}</div>
              </li>
            ))}
          </ul>
        </aside>
      </main>
      <footer className="muted small">VetFlow · PJBL Arquitetura e Soluções Cloud · Bernardo Vieira e Murilo Regnier</footer>
    </div>
  );
}

function Architecture({ api }) {
  const links = config.links ?? {};
  return (
    <div>
      <h2>Arquitetura</h2>
      <pre className="diagram">{`Microfrontend (shell + agenda + prontuário)
        │ HTTPS
        ▼
API Gateway (Azure API Management) ──► BFF Node.js (/aggregated-data, CRUD)
                                         │            │             │
                                         ▼            ▼             ▼
                                   ms-pets       ms-appointments   Azure Functions
                                   (MongoDB)     (Azure SQL)       indicadores / notificacoes
                                                     │ outbox            ▲
                                                     ▼                   │ Service Bus trigger
                                               Azure Service Bus ────────┘  (fila vetflow-eventos)`}</pre>
      <p>URL do BFF em uso: <code>{api.baseUrl}</code></p>
      <ul>
        {Object.entries(links).filter(([, v]) => v).map(([k, v]) => <li key={k}><a href={v} target="_blank" rel="noreferrer">{k}</a></li>)}
      </ul>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
