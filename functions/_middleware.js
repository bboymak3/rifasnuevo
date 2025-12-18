// functions/_middleware.js - Middleware SIMPLE
export async function onRequest(context) {
  return await context.next();
}