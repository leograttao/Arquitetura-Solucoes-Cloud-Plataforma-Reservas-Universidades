// Azure Functions v4 HTTP trigger. `@azure/functions` is intentionally optional
// for local review; the handler is also directly unit-testable.
export async function enrichOrder(request) {
  const order = request.body || await request.json?.() || {};
  const quantity = Number(order.quantity || 1);
  const unitPrice = Number(order.unitPrice || 0);
  return { ...order, quantity, subtotal: quantity * unitPrice, enrichedAt: new Date().toISOString() };
}

export default {
  handler: async (request, context) => ({ status: 200, jsonBody: await enrichOrder(request) })
};

try {
  const { app } = await import('@azure/functions');
  app.http('enrichOrder', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'orders/enrich',
    handler: async request => ({
      status: 200,
      jsonBody: await enrichOrder(request)
    })
  });
} catch {
  // The direct handler remains available for local unit tests without the
  // Azure Functions host.
}
