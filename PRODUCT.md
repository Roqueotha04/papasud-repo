# Product

## Register

product

## Users

Ingeniero de campo, administrativo de depósito y dueño de Papasud. Trabajan en chacra, planta y frío, a veces con mala señal. Cada uno entra a una tarea concreta: cargar una orden, asentar un remito, mirar stock o leer un indicador de campaña.

## Product Purpose

Trazar la cadena de la papa (parcela → orden → cosecha → lote → movimiento → stock → cliente) sin tablas de métricas que alguien tenga que mantener. El stock, las discrepancias y los indicadores se derivan de lo cargado. El éxito es que una salida no pueda superar lo disponible, y que una pregunta operativa (cuánto hay en Dospanca, qué se aplicó anoche, cuánto de exportación va a salir) se conteste en la pantalla, no en un Excel paralelo.

## Brand Personality

Sobrio, experto, de campo. Voz en español rioplatense, segunda persona, frases cortas que dicen qué se está viendo y por qué. Sin marketing, sin eufemismos: un faltante es un faltante.

## Anti-references

- Dashboards SaaS genéricos (hero-metrics, cards idénticas, gradientes).
- Apps de consumidor con onboarding largo o copy que vende.
- Spreadsheets embebidos: densidad sí, grilla infinita sin jerarquía no.
- Navegación móvil de tira horizontal con scroll: en el teléfono se trabaja con una mano, no se caza un link.

## Design Principles

- **Lo derivado no se declara.** Si se puede calcular, se calcula a la vista; jamás se pide que alguien lo cargue de nuevo.
- **Una pregunta por pantalla.** Stock es “cuánto hay acá”; proyección es “cuánto de exportación”; indicadores es “cómo cerró la campaña”. El detalle se pide, no se vuelca todo de entrada.
- **Misma pieza, mismo aspecto.** Selects, tablas, exports y estados vacíos se reconocen de una pantalla a la otra.
- **El teléfono es un puesto de trabajo.** Controles grandes, menú que no compite con el contenido, una ubicación o una parcela a la vez.

## Accessibility & Inclusion

WCAG AA como piso. Contraste de texto ≥ 4.5:1, foco visible, labels en todos los controles, `prefers-reduced-motion`. En móvil, targets de 44px y navegación por botón, no por tira scrolleable. La app se usa en el campo: no depender de hover.
