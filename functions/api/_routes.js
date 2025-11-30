// Activa el Worker automáticamente en Pages
export default {
  fetch() {
    return new Response('Worker activado', { status: 200 });
  }
};