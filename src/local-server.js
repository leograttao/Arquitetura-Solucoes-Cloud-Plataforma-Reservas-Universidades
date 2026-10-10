import http from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { MemoryReservationStore } from './adapters/memory/reservation-store.js';
import { MemoryWaitlistStore } from './adapters/memory/waitlist-store.js';
import { MemoryCatalogStore } from './adapters/memory/catalog-store.js';
import { MemoryIdentityStore } from './adapters/memory/identity-store.js';
import { makeEmailProvider } from './adapters/email/email-provider.js';
import { InMemoryEventBus } from './adapters/events/in-memory-event-bus.js';

import { makeReservationHandlers } from './services/reservations/handlers.js';
import { promoteNextWaitlistSlice } from './application/slices/waitlist/promote-next.js';
import { makeCatalogHandlers } from './services/catalog/handlers.js';
import { makeUniversityHandlers } from './services/universities/handlers.js';
import { makeIdentityHandlers } from './services/identity/handlers.js';
import { subscribeNotifications } from './services/notifications/subscribe-notifications.js';
import { makeReportUseCases } from './application/slices/reports/build-reports.js';

import { StudentBff } from './bff/student/bff.js';
import { AdminBff } from './bff/admin/bff.js';
import { AuthBff } from './bff/auth/auth-bff.js';
import { PlatformBff } from './bff/platform/bff.js';

import { makeSessionVerifier } from './gateway/auth.js';
import { ApiGateway } from './gateway/api-gateway.js';

async function start() {
  const identity = new MemoryIdentityStore();

  const stores = {
    reservations: new MemoryReservationStore(),
    waitlist: new MemoryWaitlistStore(),
    catalog: new MemoryCatalogStore(),
    universities: identity
  };

  const events = new InMemoryEventBus();

  // Cria a pasta para documentos quando uma universidade é cadastrada.
  const universityStorageRoot = resolve(
    fileURLToPath(new URL('../storage/universities/', import.meta.url))
  );

  events.subscribe('UniversityCreated', async (event) => {
    const documentsFolder = resolve(
      universityStorageRoot,
      event.payload.universityId,
      'documentos'
    );

    await mkdir(documentsFolder, { recursive: true });
    console.log(`[UniSalas] Pasta criada para documentos: ${documentsFolder}`);
  });

  const catalogHandlers = makeCatalogHandlers({
    catalog: stores.catalog
  });

  const universityHandlers = makeUniversityHandlers({
    universities: stores.universities,
    events
  });

  const identityHandlers = makeIdentityHandlers({
    identity,
    universities: stores.universities,
    events
  });

  const reports = makeReportUseCases({
    identity,
    reservations: stores.reservations,
    waitlist: stores.waitlist,
    catalog: stores.catalog
  });

  const reservationHandlers = makeReservationHandlers({
    reservations: stores.reservations,
    waitlist: stores.waitlist,
    events
  });

  events.subscribe(
    'ReservationCancelled',
    promoteNextWaitlistSlice({
      reservations: stores.reservations,
      waitlist: stores.waitlist,
      events
    })
  );

  subscribeNotifications({
    events,
    identity,
    reservations: stores.reservations,
    deliveryProvider: makeEmailProvider()
  });

  const gateway = new ApiGateway({
    verifier: makeSessionVerifier(identity),
    authBff: new AuthBff(identityHandlers),
    platformBff: new PlatformBff(identityHandlers, reports),
    studentBff: new StudentBff(
      reservationHandlers,
      catalogHandlers
    ),
    adminBff: new AdminBff(
      reservationHandlers,
      catalogHandlers,
      universityHandlers,
      identityHandlers,
      reports
    )
  });

  const appRoot = resolve(
    fileURLToPath(new URL('../apps/', import.meta.url))
  );

  const assets = {
    '/student': ['student', 'index.html', 'text/html; charset=utf-8'],
    '/student/': ['student', 'index.html', 'text/html; charset=utf-8'],
    '/student/app.js': ['student', 'app.js', 'text/javascript; charset=utf-8'],

    '/admin': ['admin', 'index.html', 'text/html; charset=utf-8'],
    '/admin/': ['admin', 'index.html', 'text/html; charset=utf-8'],
    '/admin/app.js': ['admin', 'app.js', 'text/javascript; charset=utf-8'],

    '/platform': ['platform', 'index.html', 'text/html; charset=utf-8'],
    '/platform/': ['platform', 'index.html', 'text/html; charset=utf-8'],
    '/platform/app.js': ['platform', 'app.js', 'text/javascript; charset=utf-8'],

    '/shared/styles.css': ['shared', 'styles.css', 'text/css; charset=utf-8']
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const asset = assets[url.pathname];

    if (req.method === 'GET' && asset) {
      const [folder, filename, contentType] = asset;

      try {
        const content = await readFile(
          resolve(appRoot, folder, filename)
        );

        res.writeHead(200, {
          'content-type': contentType,
          'cache-control': 'no-cache'
        });

        res.end(content);
      } catch {
        res.writeHead(404);
        res.end('Arquivo não encontrado.');
      }

      return;
    }

    let raw = '';
    let bodyBytes = 0;
    let tooLarge = false;

    for await (const chunk of req) {
      bodyBytes += chunk.length;

      if (bodyBytes > 72 * 1024 * 1024) {
        tooLarge = true;
        continue;
      }

      raw += chunk;
    }

    if (tooLarge) {
      res.writeHead(413, {
        'content-type': 'application/json; charset=utf-8'
      });

      res.end(JSON.stringify({
        error: 'O envio excede o limite da demonstração.'
      }));

      return;
    }

    let body = {};

    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }

    const result = await gateway.handle({
      method: req.method,
      path: url.pathname,
      headers: req.headers,
      body,
      query: Object.fromEntries(url.searchParams.entries())
    });

    res.writeHead(result.status, {
      'content-type': 'application/json; charset=utf-8'
    });

    res.end(JSON.stringify(result.body));
  });

  server.listen(8080, '127.0.0.1', () => {
    console.log('UniSalas disponível em http://localhost:8080');
    console.log('Administrador principal: admin@unisal.local / Admin@123');
    console.log('Alunos: código de verificação exibido neste terminal.');
  });
}

start();