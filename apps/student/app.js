const token = 'student-demo';
const app = document.getElementById('app');
const state = {
  page: 'inicio',
  rooms: [],
  reservations: [],
  waitlist: []
};

const profileKey = 'unisal-profile-student';
const headers = {
  authorization: `Bearer ${token}`,
  'content-type': 'application/json'
};

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

const localInput = (date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const now = new Date();

const defaultStart = localInput(
  new Date(Math.ceil((now.getTime() + 3600000) / 3600000) * 3600000)
);

const defaultEnd = localInput(
  new Date(Math.ceil((now.getTime() + 7200000) / 3600000) * 3600000)
);

function profile() {
  return JSON.parse(
    localStorage.getItem(profileKey) ||
      '{"name":"Estudante","email":"aluno@universidade.edu.br","course":"Engenharia de Software"}'
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function toast(message) {
  document.querySelector('.toast')?.remove();

  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  document.body.append(node);

  setTimeout(() => node.remove(), 3500);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível concluir a solicitação.');
  }

  return data;
}

async function refreshData() {
  const results = await Promise.allSettled([
    api('/student/rooms'),
    api('/student/reservations'),
    api('/student/waitlist')
  ]);

  state.rooms = results[0].status === 'fulfilled'
    ? results[0].value.items
    : [];

  state.reservations = results[1].status === 'fulfilled'
    ? results[1].value.items
    : [];

  state.waitlist = results[2].status === 'fulfilled'
    ? results[2].value.items
    : [];
}

function navLink(id, icon, label) {
  return `
    <button class="nav-link ${state.page === id ? 'active' : ''}" data-page="${id}">
      <span class="nav-icon">${icon}</span>${label}
    </button>`;
}

function shell(content) {
  const me = profile();

  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="/student">
          <span class="brand-mark">U</span>
          <span>UniSalas<small>Espaços para aprender</small></span>
        </a>

        <div class="top-actions">
          <span class="role-pill">Portal do aluno</span>
          <span class="user-pill">
            <span class="avatar">${escapeHtml((me.name || 'A').charAt(0).toUpperCase())}</span>
            <span class="user-name">${escapeHtml(me.name)}</span>
          </span>
        </div>
      </header>

      <div class="workspace">
        <aside class="sidebar">
          <div class="nav-label">Menu do aluno</div>

          <nav class="nav-list">
            ${navLink('inicio', '⌂', 'Visão geral')}
            ${navLink('reservar', '＋', 'Reservar sala')}
            ${navLink('reservas', '▤', 'Minhas reservas')}
            ${navLink('fila', '◷', 'Fila de espera')}
            ${navLink('perfil', '◉', 'Meu perfil')}
            ${navLink('ajuda', '?', 'Ajuda')}
          </nav>
        </aside>

        <main class="main">
          ${content}
          <p class="footer-note">UniSalas · Portal de reservas universitárias</p>
        </main>
      </div>
    </div>`;

  app.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => go(button.dataset.page));
  });
}

function heading(kicker, title, subtitle, action = '') {
  return `
    <div class="page-head">
      <div>
        <span class="eyebrow">${kicker}</span>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>

      ${action ? `<div class="page-actions">${action}</div>` : ''}
    </div>`;
}

function roomCards(limit = 6) {
  if (!state.rooms.length) {
    return `
      <div class="empty">
        Ainda não há salas cadastradas. A administração pode cadastrar salas pelo painel administrativo.
      </div>`;
  }

  return `
    <div class="room-list">
      ${state.rooms.slice(0, limit).map((room) => `
        <article class="room-card">
          <h3>${escapeHtml(room.name)}</h3>
          <p>Espaço universitário disponível para reserva.</p>
          <div class="room-foot">
            <span class="badge info">Até ${room.capacity} pessoas</span>
            <button class="button button-secondary button-small" data-page="reservar">
              Reservar
            </button>
          </div>
        </article>
      `).join('')}
    </div>`;
}

function dashboard() {
  const active = state.reservations
    .filter((item) => item.status === 'confirmed')
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  const upcoming = active.find((item) => Date.parse(item.startsAt) >= Date.now());
  const nextRoom = upcoming && state.rooms.find((room) => room.id === upcoming.roomId);

  return `
    ${heading(
      'Seu espaço acadêmico',
      'Olá, vamos organizar seus estudos?',
      'Encontre uma sala, acompanhe suas reservas e consulte sua fila de espera.',
      '<button class="button button-primary" data-page="reservar">＋ Nova reserva</button>'
    )}

    <div class="grid">
      <section class="card welcome col-12">
        <span class="eyebrow">Seu próximo espaço de foco</span>
        <h2>${upcoming ? escapeHtml(nextRoom?.name || 'Reserva confirmada') : 'Seu próximo estudo começa aqui.'}</h2>
        <p>
          ${
            upcoming
              ? `${formatDate(upcoming.startsAt)} até ${formatDate(upcoming.endsAt)} · Sua reserva está confirmada.`
              : 'Escolha uma sala disponível e reserve um horário para estudar com tranquilidade.'
          }
        </p>
        <button class="button button-light" data-page="reservar">Encontrar uma sala</button>
      </section>

      <section class="card stat-card col-4">
        <div>
          <div class="stat-label">Salas disponíveis</div>
          <div class="stat-value">${state.rooms.length}</div>
        </div>
        <span class="stat-icon">▦</span>
      </section>

      <section class="card stat-card col-4">
        <div>
          <div class="stat-label">Reservas confirmadas</div>
          <div class="stat-value">${active.length}</div>
        </div>
        <span class="stat-icon">✓</span>
      </section>

      <section class="card stat-card col-4">
        <div>
          <div class="stat-label">Na fila de espera</div>
          <div class="stat-value">${state.waitlist.filter((item) => item.status === 'waiting').length}</div>
        </div>
        <span class="stat-icon">◷</span>
      </section>

      <section class="card col-7">
        <div class="card-head">
          <div>
            <h2>Salas para você</h2>
            <p>Espaços cadastrados pela sua universidade.</p>
          </div>
          <button class="button button-quiet button-small" data-page="reservar">Ver todas</button>
        </div>
        ${roomCards(3)}
      </section>

      <section class="card col-5">
        <div class="card-head">
          <div>
            <h2>Acesso rápido</h2>
            <p>Continue de onde parou.</p>
          </div>
        </div>

        <div class="quick-list">
          <button class="quick-link" data-page="reservar">Reservar um horário <span>→</span></button>
          <button class="quick-link" data-page="reservas">Ver minhas reservas <span>→</span></button>
          <button class="quick-link" data-page="fila">Consultar fila de espera <span>→</span></button>
        </div>
      </section>
    </div>`;
}

function reservePage() {
  return `
    ${heading(
      'Agendamento',
      'Reserve uma sala',
      'Selecione um espaço e o período desejado.'
    )}

    <div class="grid">
      <section class="card col-7">
        <div class="card-head">
          <div>
            <h2>Detalhes da reserva</h2>
            <p>Informe o período desejado.</p>
          </div>
          <span class="badge info">Reserva online</span>
        </div>

        <form id="booking-form">
          <div class="fields">
            <div class="field full">
              <label for="room">Sala</label>
              <select id="room" required>
                <option value="">
                  ${state.rooms.length ? 'Selecione uma sala' : 'Nenhuma sala cadastrada'}
                </option>
                ${state.rooms.map((room) => `
                  <option value="${escapeHtml(room.id)}">
                    ${escapeHtml(room.name)} · até ${room.capacity} pessoas
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="field">
              <label for="start">Início</label>
              <input id="start" type="datetime-local" value="${defaultStart}" required>
            </div>

            <div class="field">
              <label for="end">Término</label>
              <input id="end" type="datetime-local" value="${defaultEnd}" required>
            </div>
          </div>

          <div class="form-actions">
            <button class="button button-secondary" id="check" type="button">
              Verificar disponibilidade
            </button>
            <button class="button button-primary" id="book" type="submit">
              Confirmar solicitação
            </button>
          </div>

          <div id="status" class="status" role="status" aria-live="polite"></div>
        </form>
      </section>

      <aside class="card col-5">
        <div class="card-head">
          <div>
            <h2>Antes de reservar</h2>
            <p>Informações úteis para seu agendamento.</p>
          </div>
        </div>

        <div class="quick-list">
          <div class="quick-link">✓ Confira o início e o término do período</div>
          <div class="quick-link">✓ Horários ocupados podem gerar fila de espera</div>
          <div class="quick-link">✓ Você pode cancelar uma reserva confirmada</div>
        </div>
      </aside>

      <section class="card col-12">
        <div class="card-head">
          <div>
            <h2>Salas cadastradas</h2>
            <p>Opções disponíveis na universidade.</p>
          </div>
        </div>
        ${roomCards()}
      </section>
    </div>`;
}

function reservationsPage() {
  const items = [...state.reservations]
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));

  return `
    ${heading(
      'Acompanhamento',
      'Minhas reservas',
      'Consulte seu histórico e cancele uma reserva confirmada.',
      '<button class="button button-quiet" id="refresh">↻ Atualizar</button>'
    )}

    <section class="card">
      <div class="card-head">
        <div>
          <h2>Histórico de solicitações</h2>
          <p>${items.length} registro(s) encontrado(s).</p>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sala</th>
              <th>Início</th>
              <th>Término</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${
              items.length
                ? items.map((item) => {
                    const room = state.rooms.find((entry) => entry.id === item.roomId);

                    return `
                      <tr>
                        <td><strong>${escapeHtml(room?.name || `Sala ${item.roomId}`)}</strong></td>
                        <td>${formatDate(item.startsAt)}</td>
                        <td>${formatDate(item.endsAt)}</td>
                        <td>
                          <span class="badge ${item.status === 'confirmed' ? '' : 'cancelled'}">
                            ${item.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                          </span>
                        </td>
                        <td>
                          ${
                            item.status === 'confirmed'
                              ? `<button class="button button-danger button-small" data-cancel="${escapeHtml(item.id)}">Cancelar</button>`
                              : '—'
                          }
                        </td>
                      </tr>`;
                  }).join('')
                : '<tr><td colspan="5"><div class="empty">Nenhuma reserva para exibir.</div></td></tr>'
            }
          </tbody>
        </table>
      </div>
    </section>`;
}

function waitlistPage() {
  const items = state.waitlist;

  return `
    ${heading(
      'Acompanhamento',
      'Fila de espera',
      'Acompanhe solicitações feitas para horários que estavam ocupados.',
      '<button class="button button-quiet" id="refresh">↻ Atualizar</button>'
    )}

    <section class="card">
      <div class="card-head">
        <div>
          <h2>Minhas solicitações na fila</h2>
          <p>${items.length} registro(s) encontrado(s).</p>
        </div>
      </div>

      ${
        items.length
          ? `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>Sala</th><th>Período</th><th>Status</th><th>Solicitação</th></tr>
                </thead>
                <tbody>
                  ${items.map((item) => {
                    const room = state.rooms.find((entry) => entry.id === item.roomId);

                    return `
                      <tr>
                        <td>${escapeHtml(room?.name || `Sala ${item.roomId}`)}</td>
                        <td>${formatDate(item.startsAt)} – ${formatDate(item.endsAt)}</td>
                        <td>
                          <span class="badge ${item.status === 'waiting' ? 'waiting' : 'info'}">
                            ${item.status === 'waiting' ? 'Aguardando' : 'Promovida'}
                          </span>
                        </td>
                        <td>${item.createdAt ? formatDate(item.createdAt) : '—'}</td>
                      </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `
          : '<div class="empty">Você não possui solicitações na fila de espera.</div>'
      }
    </section>`;
}

function profilePage() {
  const me = profile();

  return `
    ${heading('Conta', 'Meu perfil', 'Mantenha seus dados organizados.')}

    <section class="card" style="max-width:720px">
      <div class="card-head">
        <div>
          <h2>Dados pessoais</h2>
          <p>Mantenha suas informações de contato atualizadas.</p>
        </div>
      </div>

      <form id="profile-form">
        <div class="fields">
          <div class="field full">
            <label for="profile-name">Nome</label>
            <input id="profile-name" value="${escapeHtml(me.name)}" required>
          </div>

          <div class="field">
            <label for="profile-email">E-mail</label>
            <input id="profile-email" type="email" value="${escapeHtml(me.email)}" required>
          </div>

          <div class="field">
            <label for="profile-course">Curso</label>
            <input id="profile-course" value="${escapeHtml(me.course)}">
          </div>
        </div>

        <div class="form-actions">
          <button class="button button-primary" type="submit">Salvar perfil</button>
        </div>
      </form>
    </section>`;
}

function helpPage() {
  return `
    ${heading(
      'Suporte',
      'Como podemos ajudar?',
      'Respostas rápidas para usar a plataforma de reservas.'
    )}

    <div class="grid">
      <section class="card col-6">
        <div class="card-head">
          <div>
            <h2>Como faço uma reserva?</h2>
            <p>Abra “Reservar sala”, selecione o espaço e informe início e término. Verifique a disponibilidade antes de confirmar.</p>
          </div>
        </div>
      </section>

      <section class="card col-6">
        <div class="card-head">
          <div>
            <h2>O horário está ocupado?</h2>
            <p>A solicitação pode ser incluída na fila de espera. Consulte “Fila de espera” para acompanhar.</p>
          </div>
        </div>
      </section>

      <section class="card col-6">
        <div class="card-head">
          <div>
            <h2>Como cancelo?</h2>
            <p>Acesse “Minhas reservas” e use o botão “Cancelar” na reserva confirmada.</p>
          </div>
        </div>
      </section>

      <section class="card col-6">
        <div class="card-head">
          <div>
            <h2>Como consulto minhas informações?</h2>
            <p>Acesse “Minhas reservas” para acompanhar solicitações e consultar o status dos seus horários.</p>
          </div>
        </div>
      </section>
    </div>`;
}

function render() {
  const pages = {
    inicio: dashboard,
    reservar: reservePage,
    reservas: reservationsPage,
    fila: waitlistPage,
    perfil: profilePage,
    ajuda: helpPage
  };

  shell(pages[state.page]());
  bindPage();
}

function showFormStatus(message, type = 'info') {
  const node = document.getElementById('status');

  if (node) {
    node.textContent = message;
    node.className = `status visible ${type}`;
  } else {
    toast(message);
  }
}

async function submitReservation(event) {
  event.preventDefault();

  const button = document.getElementById('book');
  button.disabled = true;

  try {
    const roomId = document.getElementById('room').value;
    const startsAt = document.getElementById('start').value;
    const endsAt = document.getElementById('end').value;

    if (!roomId || !startsAt || !endsAt) {
      throw new Error('Selecione a sala, o início e o término.');
    }

    if (new Date(startsAt) >= new Date(endsAt)) {
      throw new Error('O término precisa ser posterior ao início.');
    }

    const result = await api('/student/reservations', {
      method: 'POST',
      body: JSON.stringify({
        roomId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString()
      })
    });

    await refreshData();
    showFormStatus(result.message, result.reservation ? 'success' : 'info');
  } catch (error) {
    showFormStatus(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

function bindPage() {
  document.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => go(button.dataset.page));
  });

  document.getElementById('booking-form')
    ?.addEventListener('submit', submitReservation);

  document.getElementById('check')
    ?.addEventListener('click', async () => {
      try {
        const roomId = document.getElementById('room').value;
        const startsAt = document.getElementById('start').value;
        const endsAt = document.getElementById('end').value;

        if (!roomId || !startsAt || !endsAt || new Date(startsAt) >= new Date(endsAt)) {
          throw new Error('Preencha a sala e um período válido.');
        }

        const query = new URLSearchParams({
          roomId,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString()
        });

        const result = await api(`/student/availability?${query}`);

        showFormStatus(
          result.available
            ? 'Horário disponível. Você pode confirmar a solicitação.'
            : 'Horário ocupado. Ao solicitar, você entrará na fila de espera.',
          'info'
        );
      } catch (error) {
        showFormStatus(error.message, 'error');
      }
    });

  document.getElementById('refresh')
    ?.addEventListener('click', async () => {
      await refreshData();
      render();
    });

  document.querySelectorAll('[data-cancel]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;

      try {
        await api(
          `/student/reservations/${encodeURIComponent(button.dataset.cancel)}`,
          { method: 'DELETE' }
        );

        await refreshData();
        render();
        toast('Reserva cancelada.');
      } catch (error) {
        button.disabled = false;
        toast(error.message);
      }
    });
  });

  document.getElementById('profile-form')
    ?.addEventListener('submit', (event) => {
      event.preventDefault();

      localStorage.setItem(profileKey, JSON.stringify({
        name: document.getElementById('profile-name').value.trim(),
        email: document.getElementById('profile-email').value.trim(),
        course: document.getElementById('profile-course').value.trim()
      }));

      render();
      toast('Perfil salvo neste navegador.');
    });
}

async function go(page) {
  state.page = page;
  await refreshData();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

await refreshData();
render();