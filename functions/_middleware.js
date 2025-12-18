// Middleware simple
export async function onRequest(context) {
  return await context.next();
}