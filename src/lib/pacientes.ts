/** "  José Luis  MONTERO " → "jose luis montero". Identifica al paciente junto al teléfono y permite buscar sin acentos. */
export const normalizarNombre = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
