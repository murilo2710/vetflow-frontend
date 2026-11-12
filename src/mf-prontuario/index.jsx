// Microfrontend "prontuario": pets e atendimentos (ms-pets / MongoDB) via BFF.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { dateTime, date, SPECIES_LABEL, errorText } from '../shared/format.js';

const EMPTY_PET = { name: '', species: 'DOG', breed: '', birthDate: '', weightKg: '', tutorName: '', tutorEmail: '' };
const EMPTY_RECORD = { vetName: 'Dra. Carla Mendes', diagnosis: '', prescription: '', weightKg: '' };

const toPetBody = (f) => ({
  name: f.name, species: f.species, breed: f.breed || undefined, birthDate: f.birthDate || undefined,
  weightKg: f.weightKg === '' ? undefined : Number(f.weightKg), tutorName: f.tutorName, tutorEmail: f.tutorEmail
});

function Prontuario({ ctx }) {
  const { api, notify, dataChanged } = ctx;
  const [pets, setPets] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_PET);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [record, setRecord] = useState(EMPTY_RECORD);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setPets(await api.get(`/pets${search ? `?search=${encodeURIComponent(search)}` : ''}`));
    } catch (err) {
      setError(errorText(err));
    }
  }
  useEffect(() => { load(); }, []);

  async function open(id) {
    try {
      setSelected(await api.get(`/pets/${id}`));
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function run(action, success) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      notify(success);
      dataChanged();
      await load();
      return result;
    } catch (err) {
      setError(errorText(err));
      notify(errorText(err), 'error');
      return null;
    } finally {
      setBusy(false);
    }
  }

  const savePet = async (e) => {
    e.preventDefault();
    const saved = editingId
      ? await run(() => api.put(`/pets/${editingId}`, toPetBody(form)), 'Pet atualizado.')
      : await run(() => api.post('/pets', toPetBody(form)), 'Pet cadastrado no MongoDB.');
    if (saved) {
      setForm(EMPTY_PET);
      setEditingId(null);
      open(saved.id);
    }
  };

  const edit = (p) => {
    setEditingId(p.id);
    setForm({ ...EMPTY_PET, ...p, breed: p.breed ?? '', birthDate: p.birthDate ?? '', weightKg: p.weightKg ?? '' });
  };

  const remove = async (p) => {
    if (!window.confirm(`Remover ${p.name} e todo o prontuário?`)) return;
    await run(() => api.del(`/pets/${p.id}`), 'Pet removido.');
    if (selected?.id === p.id) setSelected(null);
  };

  const addRecord = async (e) => {
    e.preventDefault();
    const body = { ...record, weightKg: record.weightKg === '' ? undefined : Number(record.weightKg), prescription: record.prescription || undefined };
    const result = await run(() => api.post(`/pets/${selected.id}/records`, body), 'Atendimento registrado no prontuário.');
    if (result) {
      setSelected(result.pet);
      setRecord(EMPTY_RECORD);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setR = (k) => (e) => setRecord({ ...record, [k]: e.target.value });

  return (
    <div className="mf">
      <h2>Pets e prontuário</h2>
      <p className="muted small">Serviço de Prontuário (ms-pets · MongoDB Atlas): um documento por pet, com os atendimentos embutidos.</p>
      {error && <div className="alert error">{error}</div>}

      <div className="grid two">
        <form className="card form" onSubmit={savePet}>
          <h3>{editingId ? 'Editar pet' : 'Cadastrar pet'}</h3>
          <div className="row">
            <label>Nome<input value={form.name} onChange={set('name')} required /></label>
            <label>Espécie<select value={form.species} onChange={set('species')}>
              {Object.entries(SPECIES_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
          </div>
          <div className="row">
            <label>Raça<input value={form.breed} onChange={set('breed')} /></label>
            <label>Nascimento<input type="date" value={form.birthDate} onChange={set('birthDate')} /></label>
            <label>Peso (kg)<input type="number" step="0.1" value={form.weightKg} onChange={set('weightKg')} /></label>
          </div>
          <div className="row">
            <label>Tutor<input value={form.tutorName} onChange={set('tutorName')} required /></label>
            <label>E-mail do tutor<input type="email" value={form.tutorEmail} onChange={set('tutorEmail')} required /></label>
          </div>
          <div>
            <button disabled={busy}>{editingId ? 'Salvar alterações' : 'Cadastrar'}</button>
            {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(EMPTY_PET); }}>Cancelar edição</button>}
          </div>
        </form>

        <div className="card">
          <div className="toolbar">
            <h3>Pets</h3>
            <form onSubmit={(e) => { e.preventDefault(); load(); }}>
              <input placeholder="Buscar por nome" value={search} onChange={(e) => setSearch(e.target.value)} />
            </form>
          </div>
          <table>
            <thead><tr><th>Nome</th><th>Espécie</th><th>Tutor</th><th>Atend.</th><th></th></tr></thead>
            <tbody>
              {pets.length === 0 && <tr><td colSpan="5" className="muted">Nenhum pet cadastrado.</td></tr>}
              {pets.map((p) => (
                <tr key={p.id} className={selected?.id === p.id ? 'selected' : ''}>
                  <td><a href="#prontuario" onClick={(e) => { e.preventDefault(); open(p.id); }}>{p.name}</a></td>
                  <td>{SPECIES_LABEL[p.species]}</td>
                  <td>{p.tutorName}</td>
                  <td>{p.recordsCount}</td>
                  <td className="actions">
                    <button className="secondary" onClick={() => edit(p)}>Editar</button>
                    <button className="danger" onClick={() => remove(p)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="card">
          <h3>Ficha de {selected.name}</h3>
          <p>{SPECIES_LABEL[selected.species]} · {selected.breed || 'sem raça definida'} · nascimento {date(selected.birthDate)} ·
            peso atual {selected.weightKg ?? '-'} kg · tutor {selected.tutorName} ({selected.tutorEmail})</p>
          <div className="grid two">
            <form className="form" onSubmit={addRecord}>
              <h4>Registrar atendimento</h4>
              <label>Veterinário<input value={record.vetName} onChange={setR('vetName')} required /></label>
              <label>Diagnóstico<input value={record.diagnosis} onChange={setR('diagnosis')} required /></label>
              <label>Prescrição<input value={record.prescription} onChange={setR('prescription')} /></label>
              <label>Peso (kg)<input type="number" step="0.1" value={record.weightKg} onChange={setR('weightKg')} /></label>
              <button disabled={busy}>Registrar</button>
            </form>
            <div>
              <h4>Histórico ({selected.records.length})</h4>
              <ul className="list">
                {selected.records.map((r) => (
                  <li key={r.id}>
                    <b>{dateTime(r.date)}</b> · {r.vetName}
                    <div>{r.diagnosis}</div>
                    {r.prescription && <div className="small muted">Prescrição: {r.prescription}</div>}
                    {r.weightKg && <div className="small muted">Peso: {r.weightKg} kg</div>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function mount(element, ctx) {
  const root = createRoot(element);
  root.render(<Prontuario ctx={ctx} />);
  return () => root.unmount();
}
