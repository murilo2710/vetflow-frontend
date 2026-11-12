import { useEffect, useRef, useState } from 'react';

/**
 * Carrega um microfrontend em tempo de execução (import dinâmico de um ES module publicado
 * separadamente) e chama o contrato mount(elemento, contexto) / unmount().
 */
export function MicroFrontend({ name, url, context }) {
  const ref = useRef(null);
  const [state, setState] = useState({ loading: true, error: null });

  useEffect(() => {
    let unmount = null;
    let cancelled = false;
    setState({ loading: true, error: null });
    import(/* webpackIgnore: true */ url)
      .then((mod) => {
        if (cancelled) return;
        unmount = mod.mount(ref.current, context);
        setState({ loading: false, error: null });
      })
      .catch((err) => !cancelled && setState({ loading: false, error: err.message }));
    return () => {
      cancelled = true;
      if (typeof unmount === 'function') unmount();
    };
  }, [url]);

  return (
    <section className="mf-host" data-microfrontend={name}>
      <div className="mf-tag">microfrontend: <b>{name}</b> <span className="muted">({url})</span></div>
      {state.loading && <p className="muted">Carregando microfrontend {name}...</p>}
      {state.error && <div className="alert error">Falha ao carregar o microfrontend {name}: {state.error}</div>}
      <div ref={ref} />
    </section>
  );
}
