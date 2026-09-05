// O pdf-parse (via pdfjs-dist) só inicializa o polyfill de `DOMMatrix` a
// partir de um addon nativo (@napi-rs/canvas), que falha em runtime
// serverless (Vercel) mesmo quando não usamos renderização de página -
// algumas constantes de módulo do pdfjs-dist chamam `new DOMMatrix()` só
// por serem carregadas. Como só extraímos texto (nunca renderizamos
// páginas), um polyfill mínimo é suficiente: o pdf-parse não sobrescreve
// `globalThis.DOMMatrix` se ele já existir. Este módulo precisa ser
// importado antes de "pdf-parse" em qualquer arquivo que o use.
if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrixPolyfill {
    constructor(_init?: unknown) {}
    multiply() {
      return this;
    }
    multiplySelf() {
      return this;
    }
    preMultiplySelf() {
      return this;
    }
    invertSelf() {
      return this;
    }
    translate() {
      return this;
    }
    scale() {
      return this;
    }
  }
  // @ts-expect-error polyfill mínimo (sem DOM real) - suficiente pois nunca renderizamos páginas
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

export {};
