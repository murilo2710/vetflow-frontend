// Utilidades de formatação compartilhadas em tempo de build (cada bundle leva a sua cópia).
export const money = (cents) => ((cents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const dateTime = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '-');

// Datas sem hora (AAAA-MM-DD) são formatadas sem conversão de fuso, para não voltar um dia.
export const date = (iso) => {
  if (!iso) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso.split('-').reverse().join('/');
  return new Date(iso).toLocaleDateString('pt-BR');
};

export const STATUS_LABEL = {
  SCHEDULED: 'Agendada (aguardando pagamento)',
  CONFIRMED: 'Confirmada (paga)',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Realizada'
};

export const SPECIES_LABEL = { DOG: 'Cão', CAT: 'Gato', OTHER: 'Outro' };

/** Converte o valor de <input type="datetime-local"> para ISO com o fuso do navegador. */
export const localInputToIso = (value) => (value ? new Date(value).toISOString() : '');

/** Valor para <input type="datetime-local"> daqui a N horas, arredondado para a hora cheia. */
export function localInputIn(hours) {
  const d = new Date(Date.now() + hours * 3600e3);
  d.setMinutes(0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Mensagem legível a partir do erro padrão { error: { message, details } } do BFF. */
export function errorText(err) {
  const body = err?.body?.error;
  if (!body) return err?.message ?? 'Erro inesperado';
  const details = body.details ? Object.values(body.details).join(' • ') : '';
  return details ? `${body.message}: ${details}` : body.message;
}
