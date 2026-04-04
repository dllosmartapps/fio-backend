export function hacerMatching(proyecto, convocatorias) {
  return convocatorias.map(c => ({
    ...c,
    score: proyecto.sector === c.sector ? 1 : 0
  }));
}
