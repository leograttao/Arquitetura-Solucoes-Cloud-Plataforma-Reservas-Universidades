import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createProductService, MongoAtlasProductRepository } from './service.js';

export const openApi = {
  openapi: '3.0.3', info: { title: 'Products service', version: '1.0.0' },
  paths: { '/products': { get: { responses: { 200: { description: 'List products' } } }, post: { responses: { 201: { description: 'Created' } } } },
    '/products/{id}': { get: { responses: { 200: { description: 'Product' } } }, put: { responses: { 200: { description: 'Updated' } } }, delete: { responses: { 204: { description: 'Deleted' } } } } }
};

export function makeProductsHandler({ service = createProductService({ repository: new MongoAtlasProductRepository() }) } = {}) {
  return async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/openapi.json') return send(res, 200, openApi);
    const match = url.pathname.match(/^\/products(?:\/([^/]+))?$/);
    if (!match) return send(res, 404, { error: 'Route not found' });
    try {
      const result = await service({ method: req.method, id: match[1], body: await body(req) });
      return send(res, result === true ? 204 : (req.method === 'POST' ? 201 : 200), result === true ? null : result);
    } catch (error) { return send(res, error.message === 'Method not allowed' ? 405 : 400, { error: error.message }); }
  };
}
function body(req) { if (['GET', 'DELETE'].includes(req.method)) return Promise.resolve({}); return new Promise(resolve => { let s = ''; req.on('data', c => s += c); req.on('end', () => resolve(s ? JSON.parse(s) : {})); }); }
function send(res, status, value) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(value == null ? '' : JSON.stringify(value)); }
export function startProductsServer() { return http.createServer(makeProductsHandler()).listen(Number(process.env.PORT || 3001)); }
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) startProductsServer();
