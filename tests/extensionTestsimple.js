// Ejemplo de test simple
const { extractCSSTags } = require('../src/utils/extractor');

test('extrae etiquetas CSS correctamente', () => {
  const css = `.boton { color: red; }`;
  const resultado = extractCSSTags(css);
  
  expect(resultado).toHaveLength(1);
  expect(resultado[0].selector).toBe('.boton');
});
