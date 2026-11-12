// Microfrontend "agenda": consultas (ms-appointments / Azure SQL) via BFF.
// Contrato com o shell: mount(elemento, { api, notify, dataChanged }) devolve a função de unmount.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { money, dateTime, STATUS_LABEL, localInputIn, localInputToIso, errorText } from '../shared/format.js';

const EMPTY = { petId: '', vetName: 'Dra. Carla Mendes', serviceId: 'consulta-clinica', startsAt: localInputIn(26), notes: '' };

function Agenda({ ctx }) {
  const { api, notify, dataChanged } = ctx;
  const [appointments, setAppointments] = useState([]);
  const [pets, setPets] = useState([]);
  const [services, setServices] = useState([]);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [a, p, s] = await Promise.all([
        api.get(`/appointments${status ? `?status=${status}` : ''}`), api.get('/pets'), api.get('/services')
      ]);
      setAppointments(a);
      setPets(p);
      setServices(s);
      setForm((f) => ({ ...f, petId: f.petId || p[0]?.id || '' }));
    } catch (err) {
      setError(errorText(err));
    }
    loadEvents();
  }

  async function loadEvents() {
    try {
      const [e, n] = await Promise.all([api.get('/events?limit=8'), api.get('/notifications?limit=8')]);
      setEvents(e);
      setNotifications(n);
    } catch { /* painel de eventos é opcional */ }
  }

  useEffect(() => { load(); }, [status]);

  async function run(action, success) {
    setBusy(true);
    setError(null);
    try {
      await action();
      notify(success);
      dataChanged();
      await load();
      setTimeout(loadEvents, 6000); // o outbox publica no Service Bus em poucos segundos
    } catch (err) {
      setError(errorText(err));
      notify(errorText(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  const submit = (e) => {
    e.preventDefault();
    run(() => api.post('/appointments', { ...form, startsAt: localInputToIso(form.startsAt) }), 'Consulta agendada! Evento AppointmentBooked publicado.');
  };

  const reschedule = (a) => {
    const value = window.prompt('Novo horário (AAAA-MM-DD HH:MM)', a.startsAt.slice(0, 16).replace('T', ' '));
    if (!value) return;
    run(() => api.put(`/appointments/${a.id}`, { startsAt: localInputToIso(value.replace(' ', 'T')) }), 'Consulta reagendada.');
  };
  const cancel = (a) => {
    const reason = window.prompt('Motivo do cancelamento');
    if (reason === null) return;
    run(() => api.patch(`/appointments/${a.id}/cancel`, { reason }), 'Consulta cancelada.');
  };
  const remove = (a) => {
    if (!window.confirm(`Excluir a consulta de ${a.petName}?`)) return;
    run(() => api.del(`/appointments/${a.id}`), 'Consulta excluída.');
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const price = services.find((s) => s.id === form.serviceId)?.priceCents;

  return (
    <div className="mf">
      <h2>Agenda de consultas</h2>
      <p className="muted small">Serviço de Agenda (ms-appointments · Azure SQL). Regras: 2h de antecedência, preço da tabela da clínica,
        sem conflito de horário do veterinário, consulta paga só cancela com 24h.</p>
      {error && <div className="alert error">{error}</div>}

      <form className="card form" onSubmit={submit}>
        <h3>Nova consulta</h3>
        {pets.length === 0 && <p className="alert">Cadastre um pet na aba "Pets e Prontuário" primeiro.</p>}
        <div className="row">
          <label>Pet<select value={form.petId} onChange={set('petId')} required>
            {pets.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.tutorName})</option>)}
          </select></label>
          <label>Serviço<select value={form.serviceId} onChange={set('serviceId')}>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {money(s.priceCents)} · {s.durationMin} min</option>)}
          </select></label>
        </div>
        <div className="row">
          <label>Veterinário<input value={form.vetName} onChange={set('vetName')} required /></label>
          <label>Data e hora<input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} required /></label>
        </div>
        <label>Observações<input value={form.notes} onChange={set('notes')} placeholder="Opcional" /></label>
        <button disabled={busy || !form.petId}>Agendar {price ? `(${money(price)})` : ''}</button>
      </form>

      <div className="toolbar">
        <h3>Consultas</h3>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <table>
        <thead><tr><th>Horário</th><th>Pet</th><th>Serviço</th><th>Veterinário</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          {appointments.length === 0 && <tr><td colSpan="7" className="muted">Nenhuma consulta.</td></tr>}
          {appointments.map((a) => (
            <tr key={a.id}>
              <td>{dateTime(a.startsAt)}</td>
              <td>{a.petName}</td>
              <td>{a.serviceName}</td>
              <td>{a.vetName}</td>
              <td>{money(a.priceCents)}</td>
              <td><span className={`badge st-${a.status}`}>{STATUS_LABEL[a.status]}</span>{a.cancelReason && <div className="small muted">{a.cancelReason}</div>}</td>
              <td className="actions">
                {a.status === 'SCHEDULED' && <button disabled={busy} onClick={() => run(() => api.patch(`/appointments/${a.id}/confirm`), 'Pagamento aprovado: consulta confirmada.')}>Pagar/Confirmar</button>}
                {a.status === 'SCHEDULED' && <button disabled={busy} className="secondary" onClick={() => reschedule(a)}>Reagendar</button>}
                {['SCHEDULED', 'CONFIRMED'].includes(a.status) && <button disabled={busy} className="secondary" onClick={() => cancel(a)}>Cancelar</button>}
                {['SCHEDULED', 'CANCELLED'].includes(a.status) && <button disabled={busy} className="danger" onClick={() => remove(a)}>Excluir</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid two">
        <div className="card">
          <div className="toolbar"><h3>Eventos publicados (outbox → Service Bus)</h3><button className="secondary" onClick={loadEvents}>Atualizar</button></div>
          <ul className="list">
            {events.map((e) => (
              <li key={e.id}>
                <b>{e.type}</b> · {e.payload?.data?.petName}
                <div className="small muted">{dateTime(e.occurredAt)} · {e.sentAt ? `publicado ${dateTime(e.sentAt)}` : `pendente (tentativas: ${e.attempts})`}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="toolbar"><h3>Notificações geradas pela Function</h3><button className="secondary" onClick={loadEvents}>Atualizar</button></div>
          <ul className="list">
            {notifications.map((n) => (
              <li key={n.id}><b>{n.titulo}</b> <span className="small muted">→ {n.destinatario}</span><div className="small">{n.mensagem}</div></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function mount(element, ctx) {
  const root = createRoot(element);
  root.render(<Agenda ctx={ctx} />);
  return () => root.unmount();
}
