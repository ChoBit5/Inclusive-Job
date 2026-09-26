import test from 'node:test';
import assert from 'node:assert/strict';
import { readInterfaceResource } from '../src/data/resources.js';
import { useComentariosPublicos, useDocumentosPostulante, useEntrevistaIA, usePostulanteChatHistorial, useReclutadorChatHistorial, useRecomendacionVacantesIA, useVacantesPostulante, useVacantesReclutador } from '../src/data/interface.js';

test('los datos de interfaz se entregan sin estado compartido', () => {
  const first = readInterfaceResource('admin:vacantes');
  first.data.vacantes[0].titulo = 'Cambio visual';

  const second = readInterfaceResource('admin:vacantes');
  assert.equal(second.data.vacantes[0].titulo, 'Diseñador/a UX');
});

test('los adaptadores mock conservan referencias entre renders', () => {
  assert.strictEqual(useVacantesReclutador().data, useVacantesReclutador().data);
  assert.strictEqual(useVacantesPostulante().listarVacantes, useVacantesPostulante().listarVacantes);
  assert.strictEqual(usePostulanteChatHistorial().cargarHistorial, usePostulanteChatHistorial().cargarHistorial);
  assert.strictEqual(useReclutadorChatHistorial().cargarHistorial, useReclutadorChatHistorial().cargarHistorial);
  assert.strictEqual(useComentariosPublicos().cargarComentarios, useComentariosPublicos().cargarComentarios);
  assert.strictEqual(useDocumentosPostulante().verificarCv, useDocumentosPostulante().verificarCv);
});

test('las respuestas mock entregan los campos que usan chat y vacantes', async () => {
  const recomendaciones = await useRecomendacionVacantesIA().recomendarVacantes();
  const entrevista = await useEntrevistaIA().iniciarEntrevista(1);

  assert.equal(recomendaciones.auth, true);
  assert.equal(Array.isArray(recomendaciones.recomendaciones), true);
  assert.equal(typeof entrevista.mensaje, 'string');
});
