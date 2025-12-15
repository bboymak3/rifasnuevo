// functions/api/admin/status.js
export async function onRequest(context) {
  const { env } = context;
  try {
    const adminPresent = !!env.ADMIN_TOKEN;
    return new Response(JSON.stringify({ success: true, admin_token_present: adminPresent, now: new Date().toISOString() }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
