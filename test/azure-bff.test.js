import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBffHandler } from '../azure/bff/server.js';

test('BFF expõe handler e contrato de agregação', () => {
  assert.equal(typeof makeBffHandler({ productsUrl: 'http://products', ordersUrl: 'http://orders' }), 'function');
});

test('BFF agrega dados dos dois serviços', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => ({
    ok: true,
    json: async () => url.includes('products') ? [{ id: 'p1' }] : [{ id: 'o1' }]
  });
  const response = { writeHead(status) { this.status = status; }, end(value) { this.value = JSON.parse(value); } };
  await makeBffHandler({ productsUrl: 'http://products', ordersUrl: 'http://orders' })(
    { method: 'GET', url: '/aggregated-data' }, response
  );
  globalThis.fetch = originalFetch;
  assert.equal(response.status, 200);
  assert.deepEqual(response.value.products, [{ id: 'p1' }]);
  assert.deepEqual(response.value.orders, [{ id: 'o1' }]);
});
