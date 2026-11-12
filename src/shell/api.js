// Cliente HTTP do BFF. É o único ponto de saída do frontend: shell e microfrontends recebem
// esta instância e nunca chamam os microserviços diretamente. Cada chamada é registrada no
// painel "Chamadas ao BFF" com o x-correlation-id devolvido pelo BFF.
export function createApi(baseUrl, onCall = () => {}) {
  const base = baseUrl.replace(/\/+$/, '');

  async function request(method, path, body) {
    const started = performance.now();
    let status = 0;
    let correlationId = null;
    try {
      const res = await fetch(base + path, {
        method,
        headers: body !== undefined ? { 'content-type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      status = res.status;
      correlationId = res.headers.get('x-correlation-id');
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const err = new Error(data?.error?.message || `HTTP ${res.status}`);
        err.status = res.status;
        err.body = data;
        throw err;
      }
      return data;
    } catch (err) {
      if (!err.status) err.body = { error: { message: `Não foi possível falar com o BFF (${base}). ${err.message}` } };
      throw err;
    } finally {
      onCall({ method, url: base + path, path, status, ms: Math.round(performance.now() - started), correlationId, at: new Date() });
    }
  }

  return {
    baseUrl: base,
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body ?? {}),
    put: (path, body) => request('PUT', path, body ?? {}),
    patch: (path, body) => request('PATCH', path, body ?? {}),
    del: (path) => request('DELETE', path)
  };
}
