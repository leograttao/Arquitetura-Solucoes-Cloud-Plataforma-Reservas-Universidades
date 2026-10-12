import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createOrderService, AzureSqlOrderRepository } from './service.js';
export const openApi = { openapi: '3.0.3', info: { title: 'Orders service', version: '1.0.0' }, paths: { '/orders': { get: { responses: { 200: { description: 'List orders' } } }, post: { responses: { 201: { description: 'Created' } } } }, '/orders/{id}': { get: { responses: { 200: { description: 'Order' } } }, put: { responses: { 200: { description: 'Updated' } } }, delete: { responses: { 204: { description: 'Deleted' } } } } } };
export function makeOrdersHandler({ service = createOrderService({ repository: new AzureSqlOrderRepository() }) } = {}) {
  return async (req, res) => { const url = new URL(req.url, 'http://localhost'); if (url.pathname === '/openapi.json') return send(res, 200, openApi); const m = url.pathname.match(/^\/orders(?:\/([^/]+))?$/); if (!m) return send(res, 404, { error: 'Route not found' }); try { const result = await service({ method: req.method, id: m[1], body: await body(req) }); return send(res, result === true ? 204 : req.method === 'POST' ? 201 : 200, result === true ? null : result); } catch (e) { return send(res, 400, { error: e.message }); } };
}
function body(req) { if (['GET', 'DELETE'].includes(req.method)) return Promise.resolve({}); return new Promise(resolve => { let s = ''; req.on('data', c => s += c); req.on('end', () => resolve(s ? JSON.parse(s) : {})); }); }
function send(res, status, value) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(value == null ? '' : JSON.stringify(value)); }
export function startOrdersServer() { return http.createServer(makeOrdersHandler()).listen(Number(process.env.PORT || 3002)); }
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) startOrdersServer();
