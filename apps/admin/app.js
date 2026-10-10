const token = 'admin-demo';
const app = document.getElementById('app');
const state = { page: 'inicio', rooms: [], reservations: [], filter: 'all' };
const profileKey = 'unisal-profile-admin';
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

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatDay(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(value));
}

function toast(message) {
  document.querySelector('.toast')?.remove();

  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  document.body.append(node);

  setTimeout(() => node.remove(), 3500);
}

function profile() {
  return JSON.parse(
    localStorage.getItem(profileKey) ||
      '{"name":"Administradora","email":"admin@universidade.edu.br"}'
  );
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
    api('/admin/rooms'),
    api('/admin/reservations')
  ]);

  state.rooms = results[0].status === 'fulfilled'
    ? results[0].value.items
    : [];

  state.reservations = results[1].status === 'fulfilled'
    ? results[1].value.items
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
        <a class="brand" href="/admin">
          <span class="brand-mark">U</span>
          <span>UniSalas<small>Painel universitário</small></span>
        </a>

        <div class="top-actions">
          <span class="role-pill">Administração</span>
          <span class="user-pill">
            <span class="avatar">${escapeHtml((me.name || 'A').charAt(0).toUpperCase())}</span>
            <span class="user-name">${escapeHtml(me.name)}</span>
          </span>
        </div>
      </header>

      <div class="workspace">
        <aside class="sidebar">
          <div class="nav-label">Gestão universitária</div>

          <nav class="nav-list">
            ${navLink('inicio', '⌂', 'Visão geral')}
            ${navLink('salas', '▦', 'Salas')}
            ${navLink('reservas', '▤', 'Reservas')}
            ${navLink('agenda', '▦', 'Agenda')}
            ${navLink('perfil', '◉', 'Meu perfil')}
            ${navLink('ajuda', '?', 'Ajuda')}
          </nav>
        </aside>

        <main class="main">
          ${content}
          <p class="footer-note">UniSalas · Painel universitário</p>
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

function activeReservations() {
  return state.reservations.filter((item) => item.status === 'confirmed');
}

function roomName(id) {
  return state.rooms.find((room) => room.id === id)?.name || `Sala ${id}`;
}

function dashboard() {
  const active = activeReservations();
  const today = new Date().toDateString();

  const todayCount = active.filter(
    (item) => new Date(item.startsAt).toDateString() === today
  ).length;

  const recent = [...state.reservations]
    .sort(
      (a, b) =>
        Date.parse(b.createdAt || b.startsAt) -
        Date.parse(a.createdAt || a.startsAt)
    )
    .slice(0, 5);

  return `
    ${heading(
      'Painel da universidade',
      'Visão geral',
      'Acompanhe salas, reservas e a ocupação dos espaços.',
      '<button class="button button-primary" data-page="salas">＋ Cadastrar sala</button>'
    )}

    <div class="grid">
      <section class="card welcome col-12">
        <span class="eyebrow">Gestão universitária</span>
        <h2>Espaços organizados, agenda em dia.</h2>
        <p>Gerencie as salas e acompanhe as solicitações recebidas.</p>
        <button class="button button-light" data-page="reservas">Ver reservas</button>
      </section>

      <section class="card stat-card col-4">
        <div>
          <div class="stat-label">Salas cadastradas</div>
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
          <div class="stat-label">Reservas para hoje</div>
          <div class="stat-value">${todayCount}</div>
        </div>
        <span class="stat-icon">◷</span>
      </section>

      <section class="card col-7">
        <div class="card-head">
          <div>
            <h2>Solicitações recentes</h2>
            <p>Reservas registradas recentemente.</p>
          </div>
          <button class="button button-quiet button-small" data-page="reservas">
            Ver todas
          </button>
        </div>

        ${
          recent.length
            ? `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sala</th>
                      <th>Aluno</th>
                      <th>Início</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recent.map((item) => `
                      <tr>
                        <td>${escapeHtml(roomName(item.roomId))}</td>
                        <td>${escapeHtml(item.actorId)}</td>
                        <td>${formatDate(item.startsAt)}</td>
                        <td>
                          <span class="badge ${item.status === 'confirmed' ? '' : 'cancelled'}">
                            ${item.status === 'confirmed' ? 'Confirmada' : item.status}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `
            : '<div class="empty">Ainda não há reservas registradas.</div>'
        }
      </section>

      <section class="card col-5">
        <div class="card-head">
          <div>
            <h2>Acesso rápido</h2>
            <p>Atalhos de gestão.</p>
          </div>
        </div>

        <div class="quick-list">
          <button class="quick-link" data-page="salas">
            Cadastrar e consultar salas <span>→</span>
          </button>
          <button class="quick-link" data-page="reservas">
            Consultar reservas <span>→</span>
          </button>
          <button class="quick-link" data-page="agenda">
            Abrir agenda <span>→</span>
          </button>
        </div>
      </section>
    </div>`;
}

function roomsPage() {
  return `
    ${heading(
      'Catálogo',
      'Gestão de salas',
      'Cadastre e consulte os espaços oferecidos aos estudantes.'
    )}

    <div class="grid">
      <section class="card col-5">
        <div class="card-head">
          <div>
            <h2>Nova sala</h2>
            <p>Informe nome e capacidade máxima.</p>
          </div>
        </div>

        <form id="room-form">
          <div class="fields">
            <div class="field full">
              <label for="name">Nome da sala</label>
              <input
                id="name"
                name="name"
                placeholder="Ex.: Laboratório 04"
                maxlength="150"
                required
              >
            </div>

            <div class="field full">
              <label for="capacity">Capacidade de pessoas</label>
              <input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                max="500"
                placeholder="Ex.: 30"
                required
              >
            </div>
          </div>

          <div class="form-actions">
            <button class="button button-primary" id="create" type="submit">
              Cadastrar sala
            </button>
          </div>

          <div id="status" class="status" role="status" aria-live="polite"></div>
        </form>
      </section>

      <section class="card col-7">
        <div class="card-head">
          <div>
            <h2>Salas cadastradas</h2>
            <p>${state.rooms.length} espaço(s) no catálogo desta universidade.</p>
          </div>
          <button class="button button-quiet button-small" id="refresh">↻ Atualizar</button>
        </div>

        ${
          state.rooms.length
            ? `
              <div class="room-list">
                ${state.rooms.map((room) => `
                  <article class="room-card">
                    <h3>${escapeHtml(room.name)}</h3>
                    <p>Identificador: ${escapeHtml(room.id)}</p>
                    <div class="room-foot">
                      <span class="badge info">Capacidade ${room.capacity}</span>
                      <span class="muted" style="font-size:10px">Ativa</span>
                    </div>
                  </article>
                `).join('')}
              </div>
            `
            : '<div class="empty">Nenhuma sala cadastrada. Use o formulário para criar a primeira.</div>'
        }
      </section>
    </div>`;
}

function reservationsPage() {
  const filtered = state.filter === 'all'
    ? state.reservations
    : state.reservations.filter((item) => item.status === state.filter);

  return `
    ${heading(
      'Operação',
      'Reservas',
      'Consulte as solicitações dos alunos e seus respectivos status.',
      '<button class="button button-quiet" id="refresh">↻ Atualizar</button>'
    )}

    <section class="card">
      <div class="card-head">
        <div>
          <h2>Reservas da universidade</h2>
          <p>${filtered.length} registro(s) exibido(s).</p>
        </div>

        <div class="field">
          <label for="filter">Filtrar por status</label>
          <select id="filter">
            <option value="all" ${state.filter === 'all' ? 'selected' : ''}>Todas</option>
            <option value="confirmed" ${state.filter === 'confirmed' ? 'selected' : ''}>Confirmadas</option>
            <option value="cancelled" ${state.filter === 'cancelled' ? 'selected' : ''}>Canceladas</option>
          </select>
        </div>
      </div>

      ${
        filtered.length
          ? `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sala</th>
                    <th>Aluno</th>
                    <th>Início</th>
                    <th>Término</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map((item) => `
                    <tr>
                      <td><strong>${escapeHtml(roomName(item.roomId))}</strong></td>
                      <td>${escapeHtml(item.actorId)}</td>
                      <td>${formatDate(item.startsAt)}</td>
                      <td>${formatDate(item.endsAt)}</td>
                      <td>
                        <span class="badge ${item.status === 'confirmed' ? '' : 'cancelled'}">
                          ${item.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `
          : '<div class="empty">Nenhuma reserva corresponde a este filtro.</div>'
      }
    </section>`;
}

function agendaPage() {
  const active = activeReservations()
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  const days = new Map();

  for (const item of active) {
    const key = new Date(item.startsAt).toDateString();

    if (!days.has(key)) {
      days.set(key, []);
    }

    days.get(key).push(item);
  }

  return `
    ${heading(
      'Organização',
      'Agenda de reservas',
      'Visualização cronológica das reservas confirmadas.',
      '<button class="button button-quiet" id="refresh">↻ Atualizar</button>'
    )}

    <section class="card">
      <div class="card-head">
        <div>
          <h2>Próximos horários</h2>
          <p>Reservas confirmadas organizadas por data.</p>
        </div>
        <span class="badge info">${active.length} confirmada(s)</span>
      </div>

      ${
        active.length
          ? [...days.values()].map((items) => `
              <h3 style="font:700 13px Manrope,sans-serif;margin:20px 0 10px">
                ${formatDay(items[0].startsAt)}
              </h3>

              <div class="timeline">
                ${items.map((item) => `
                  <div class="timeline-item">
                    <span class="timeline-time">
                      ${new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(item.startsAt))}
                    </span>
                    <span class="timeline-line"></span>
                    <div class="timeline-content">
                      <strong>${escapeHtml(roomName(item.roomId))}</strong>
                      <div class="booking-sub">
                        Aluno ${escapeHtml(item.actorId)} · até
                        ${new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(item.endsAt))}
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `).join('')
          : '<div class="empty">A agenda ficará disponível quando houver reservas confirmadas.</div>'
      }
    </section>`;
}

function profilePage() {
  const me = profile();

  return `
    ${heading(
      'Conta',
      'Meu perfil',
      'Atualize os dados da pessoa responsável pelo painel.'
    )}

    <section class="card" style="max-width:720px">
      <div class="card-head">
        <div>
          <h2>Dados do administrador</h2>
          <p>Mantenha suas informações de contato atualizadas.</p>
        </div>
      </div>

      <form id="profile-form">
        <div class="fields">
          <div class="field full">
            <label for="profile-name">Nome</label>
            <input id="profile-name" value="${escapeHtml(me.name)}" required>
          </div>

          <div class="field full">
            <label for="profile-email">E-mail</label>
            <input id="profile-email" type="email" value="${escapeHtml(me.email)}" required>
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
      'Ajuda do painel',
      'Orientações para usar as funções administrativas.'
    )}

    <div class="grid">
      <section class="card col-6">
        <div class="card-head">
          <div>
            <h2>Como cadastro uma sala?</h2>
            <p>Acesse “Salas”, informe o nome e a capacidade e selecione “Cadastrar sala”.</p>
          </div>
        </div>
      </section>

      <section class="card col-6">
        <div class="card-head">
          <div>
            <h2>Como acompanho as reservas?</h2>
            <p>Acesse “Reservas” para consultar o aluno, a sala, o período e o status da solicitação.</p>
          </div>
        </div>
      </section>

      <section class="card col-6">
        <div class="card-head">
          <div>
            <h2>Como vejo os horários?</h2>
            <p>Acesse “Agenda” para visualizar as reservas confirmadas organizadas por data e horário.</p>
          </div>
        </div>
      </section>

      <section class="card col-6">
        <div class="card-head">
          <div>
            <h2>Como atualizo as informações?</h2>
            <p>Use o botão “Atualizar” nas telas de salas e reservas para consultar os registros mais recentes.</p>
          </div>
        </div>
      </section>
    </div>`;
}

function render() {
  const pages = {
    inicio: dashboard,
    salas: roomsPage,
    reservas: reservationsPage,
    agenda: agendaPage,
    perfil: profilePage,
    ajuda: helpPage
  };

  shell(pages[state.page]());
  bindPage();
}

function showStatus(message, type = 'success') {
  const box = document.getElementById('status');

  if (box) {
    box.textContent = message;
    box.className = `status visible ${type}`;
  } else {
    toast(message);
  }
}

function bindPage() {
  document.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => go(button.dataset.page));
  });

  document.getElementById('room-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = document.getElementById('create');
    button.disabled = true;

    try {
      const name = document.getElementById('name').value.trim();
      const capacity = Number(document.getElementById('capacity').value);

      await api('/admin/rooms', {
        method: 'POST',
        body: JSON.stringify({ name, capacity })
      });

      await refreshData();
      render();
      toast('Sala cadastrada e disponível para os alunos.');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('refresh')?.addEventListener('click', async () => {
    await refreshData();
    render();
  });

  document.getElementById('filter')?.addEventListener('change', (event) => {
    state.filter = event.target.value;
    render();
  });

  document.getElementById('profile-form')?.addEventListener('submit', (event) => {
    event.preventDefault();

    localStorage.setItem(profileKey, JSON.stringify({
      name: document.getElementById('profile-name').value.trim(),
      email: document.getElementById('profile-email').value.trim()
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