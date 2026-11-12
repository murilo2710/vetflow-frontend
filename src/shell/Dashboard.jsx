import { useEffect, useState } from 'react';
import { money, dateTime, STATUS_LABEL, SPECIES_LABEL, errorText } from '../shared/format.js';

/** Painel inicial: consome o GET /aggregated-data do BFF (ms-pets + ms-appointments + Function). */
export function Dashboard({ api }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showJson, setShowJson] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get('/aggregated-data'));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener('vetflow:data-changed', refresh);
    return () => window.removeEventListener('vetflow:data-changed', refresh);
  }, []);

  const ind = data?.indicators;
  return (
    <div>
      <div className="toolbar">
        <h2>Painel da clínica</h2>
        <div>
          <button onClick={load} disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar'}</button>
          <button className="secondary" onClick={() => setShowJson(!showJson)}>{showJson ? 'Ocultar JSON' : 'Ver JSON agregado'}</button>
        </div>
      </div>
      <p className="muted">Uma única chamada <code>GET /aggregated-data</code> ao BFF, que consulta o Microserviço 1 (MongoDB),
        o Microserviço 2 (Azure SQL) e a Azure Function e devolve tudo junto.</p>
      {error && <div className="alert error">{error}</div>}

      {data && (
        <>
          <h3>Fontes consultadas pelo BFF</h3>
          <div className="grid sources">
            {Object.entries(data.sources).map(([name, s]) => (
              <div key={name} className={`card source ${s.status}`}>
                <div className="source-name">{name}</div>
                <div className={`badge ${s.status}`}>{s.status.toUpperCase()}</div>
                <div className="muted small">{s.endpoint} · {s.ms} ms</div>
                {s.error && <div className="small error-text">{s.error}</div>}
              </div>
            ))}
          </div>
          <p className="muted small">correlationId: <code>{data.correlationId}</code> · gerado em {dateTime(data.generatedAt)}</p>

          <h3>Indicadores (calculados pela Azure Function)</h3>
          {ind ? (
            <div className="grid kpis">
              <Kpi label="Faturamento confirmado" value={money(ind.faturamentoConfirmadoCents)} />
              <Kpi label="Receita prevista (a pagar)" value={money(ind.receitaPrevistaCents)} />
              <Kpi label="Ticket médio" value={money(ind.ticketMedioCents)} />
              <Kpi label="Consultas" value={ind.totalConsultas} />
              <Kpi label="Taxa de confirmação" value={`${ind.taxaConfirmacaoPercent}%`} />
              <Kpi label="Taxa de cancelamento" value={`${ind.taxaCancelamentoPercent}%`} />
            </div>
          ) : <p className="muted">Indicadores indisponíveis.</p>}

          <div className="grid two">
            <div className="card">
              <h3>Próximas consultas</h3>
              {data.upcoming.length === 0 && <p className="muted">Nenhuma consulta futura.</p>}
              <ul className="list">
                {data.upcoming.map((a) => (
                  <li key={a.id}>
                    <b>{dateTime(a.startsAt)}</b> · {a.pet?.name ?? a.petName} ({SPECIES_LABEL[a.pet?.species] ?? '?'}) · {a.serviceName}
                    <div className="muted small">{a.vetName} · {STATUS_LABEL[a.status]} · {money(a.priceCents)}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3>Notificações (eventos → Function)</h3>
              {data.notifications.length === 0 && <p className="muted">Nenhuma notificação ainda.</p>}
              <ul className="list">
                {data.notifications.map((n) => (
                  <li key={n.id}>
                    <b>{n.titulo}</b> <span className="muted small">para {n.destinatario}</span>
                    <div className="small">{n.mensagem}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid two">
            <div className="card">
              <h3>Pets (ms-pets · MongoDB)</h3>
              <p className="big">{data.summary.pets ?? '-'}</p>
              <ul className="list">{data.pets.slice(0, 5).map((p) => <li key={p.id}>{p.name} · {SPECIES_LABEL[p.species]} · {p.tutorName}</li>)}</ul>
            </div>
            <div className="card">
              <h3>Consultas por veterinário (Function)</h3>
              <ul className="list">
                {(ind?.porVeterinario ?? []).map((v) => <li key={v.vetName}>{v.vetName}: {v.consultas} consulta(s) · {money(v.faturamentoCents)}</li>)}
              </ul>
            </div>
          </div>

          {showJson && <pre className="json">{JSON.stringify(data, null, 2)}</pre>}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="card kpi">
      <div className="muted small">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}
