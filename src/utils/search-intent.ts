// Señal efímera de un solo uso: "el usuario acaba de pulsar 'Buscar ahora'
// en (welcome)". NearbyMarkersMap la consume una vez al llegar a 'ready'
// para decidir si abre el desplegable de cercanos automáticamente — pedido
// explícitamente así: ese popup automático solo debe aparecer llegando
// desde ese botón, nunca al entrar a Home con sesión ya iniciada ni al
// volver a /map por cualquier otro camino.
//
// Variable de módulo, no estado de React ni Context: solo necesita
// sobrevivir una transición de navegación síncrona (incluida la que hace
// /map al redirigir a (tabs) si ya hay sesión) y leerse una única vez desde
// el próximo montaje, sin re-renderizar nada mientras tanto.
let pending = false;

export function markSearchIntent(): void {
  pending = true;
}

export function consumeSearchIntent(): boolean {
  const value = pending;
  pending = false;
  return value;
}
