import http from 'node:http';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 3000);
const PRODUCTS_URL = process.env.PRODUCTS_URL || 'http://localhost:3001';
const ORDERS_URL = process.env.ORDERS_URL || 'http://localhost:3002';
const FUNCTION_URL = process.env.FUNCTION_URL || 'http://localhost:7071/api/orders/enrich';

export function makeBffHandler({
  productsUrl = PRODUCTS_URL,
  ordersUrl = ORDERS_URL,
  functionUrl = FUNCTION_URL,
  eventPublisher = publishEvent
} = {}) {
  return async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const json = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method === 'GET' && url.pathname === '/aggregated-data') {
        const [products, orders, enrichment] = await Promise.all([
          fetch(`${productsUrl}/products`).then(r => r.json()),
          fetch(`${ordersUrl}/orders`).then(r => r.json()),
          fetch(functionUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ productsUrl, ordersUrl })
          }).then(r => r.json())
        ]);
        return json(200, {
          products,
          orders,
          enrichment,
          generatedAt: new Date().toISOString()
        });
      }
      const match = url.pathname.match(/^\/(products|orders)(\/.*)?$/);
      if (!match) return json(404, { error: 'Route not found' });
      const target = match[1] === 'products' ? productsUrl : ordersUrl;
      const path = `/${match[1]}${match[2] || ''}${url.search}`;
      const body = ['GET', 'DELETE'].includes(req.method) ? undefined : await readBody(req);
      const response = await fetch(`${target}${path}`, {
        method: req.method, headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const text = await response.text();
      if (response.ok && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        await eventPublisher({
          type: `${req.method} ${match[1]}`,
          resource: match[1],
          payload: body
        });
      }
      res.writeHead(response.status, { 'content-type': 'application/json; charset=utf-8' });
      return res.end(text || '{}');
    } catch (error) {
      return json(502, { error: 'Upstream unavailable', detail: error.message });
    }

  };
}

async function publishEvent(event) {
  if (!process.env.SERVICE_BUS_CONNECTION_STRING) {
    return;
  }

  const { ServiceBusClient } = await import('@azure/service-bus');
  const client = new ServiceBusClient(
    process.env.SERVICE_BUS_CONNECTION_STRING
  );
  const sender = client.createSender(
    process.env.SERVICE_BUS_TOPIC || 'pjbl-events'
  );

  try {
    await sender.sendMessages({ body: event, contentType: 'application/json' });
  } finally {
    await sender.close();
    await client.close();
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

export function startBffServer(options) {
  const server = http.createServer(makeBffHandler(options));
  return server.listen(PORT, () => console.log(`BFF listening on ${PORT}`));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) startBffServer();
