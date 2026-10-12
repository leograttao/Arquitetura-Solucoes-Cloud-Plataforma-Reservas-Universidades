import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductService, MongoAtlasProductRepository } from '../azure/services/products/service.js';
import { createOrderService, AzureSqlOrderRepository } from '../azure/services/orders/service.js';
import { enrichOrder } from '../azure/functions/enrich-order/index.js';

test('adapters tornam fallback em memória explícito', () => {
  assert.equal(new MongoAtlasProductRepository().mode, 'memory-demo-fallback');
  assert.equal(new AzureSqlOrderRepository().mode, 'memory-demo-fallback');
});
test('products e orders oferecem CRUD independente', async () => {
  const products = createProductService(); const product = await products({ method: 'POST', body: { name: 'Sala' } });
  assert.equal((await products({ method: 'GET' })).length, 1);
  assert.equal((await products({ method: 'DELETE', id: product.id })), true);
  const orders = createOrderService(); const order = await orders({ method: 'POST', body: { quantity: 2, unitPrice: 5 } });
  assert.equal((await orders({ method: 'PUT', id: order.id, body: { status: 'paid' } })).status, 'paid');
});
test('function calcula subtotal e enriquece a ordem', async () => {
  const result = await enrichOrder({ body: { quantity: 3, unitPrice: 4 } });
  assert.equal(result.subtotal, 12); assert.ok(result.enrichedAt);
});
