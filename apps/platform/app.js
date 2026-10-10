const app = document.getElementById('app');
const sessionKey = 'unisal-platform-session';

const state = {
  universities: [],
  report: null,
  message: ''
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionKey));
  } catch {
    return null;
  }
}

async function api(path, options = {}) {
  const token = getSession()?.token;

  const response = await fetch(path, {
    ...options,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json',
      ...options.headers
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Não foi possível concluir a operação.');
  }

  return result;
}

function showLogin(errorMessage = '') {
  app.innerHTML = `
    <main class="main platform-main">
      <header class="brand login-brand">
        <span class="brand-mark">U</span>
        <span>UniSalas<small>Administração principal</small></span>
      </header>

      <section class="card login-card">
        <div class="card-head">
          <div>
            <span class="eyebrow">Acesso restrito</span>
            <h2>Entrar na plataforma</h2>
            <p>Use as credenciais do administrador principal.</p>
          </div>
        </div>

        <form id="login-form">
          <div class="fields">
            <div class="field full">
              <label for="login-email">E-mail</label>
              <input
                id="login-email"
                type="email"
                value="admin@unisal.local"
                required>
            </div>

            <div class="field full">
              <label for="login-password">Senha</label>
              <input
                id="login-password"
                type="password"
                required>
            </div>
          </div>

          <div class="form-actions">
            <button class="button button-primary" type="submit">
              Entrar
            </button>
          </div>

          <div class="status ${errorMessage ? 'visible error' : ''}">
            ${escapeHtml(errorMessage)}
          </div>
        </form>
      </section>
    </main>
  `;

  document.getElementById('login-form').onsubmit = async (event) => {
    event.preventDefault();

    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('login-email').value,
          password: document.getElementById('login-password').value
        })
      });

      if (result.principal.role !== 'platform-admin') {
        throw new Error(
          'Esta conta não tem acesso à administração principal.'
        );
      }

      localStorage.setItem(sessionKey, JSON.stringify(result));
      await loadData();
    } catch (error) {
      showLogin(error.message);
    }
  };
}

async function loadData() {
  try {
    const [universitiesResult, reportResult] = await Promise.all([
      api('/platform/universities'),
      api('/platform/reports')
    ]);

    state.universities = universitiesResult.items;
    state.report = reportResult;
    render();
  } catch (error) {
    localStorage.removeItem(sessionKey);
    showLogin(error.message);
  }
}

function universityStatus(status) {
  return status === 'suspended' ? 'Suspensa' : 'Ativa';
}

function render() {
  if (!getSession()) {
    showLogin();
    return;
  }

  const totals = state.report?.totals ?? {};
  const activeUniversities = state.universities.filter(
    (university) => university.status === 'active'
  );

  const universityOptions = activeUniversities.map((university) => `
    <option value="${escapeHtml(university.id)}">
      ${escapeHtml(university.name)}
    </option>
  `).join('');

  const universityRows = state.universities.map((university) => {
    const statusClass =
      university.status === 'active' ? '' : 'cancelled';

    const statusButton = university.status === 'active'
      ? `<button class="button button-quiet button-small"
           data-status="suspended" data-id="${escapeHtml(university.id)}">
           Suspender
         </button>`
      : `<button class="button button-quiet button-small"
           data-status="active" data-id="${escapeHtml(university.id)}">
           Reativar
         </button>`;

    return `
      <tr>
        <td>
          <strong>${escapeHtml(university.name)}</strong>
          <br>
          <small>ID: ${escapeHtml(university.id)}</small>
        </td>

        <td>
          ${(university.domains || []).map(escapeHtml).join('<br>')}
        </td>

        <td>
          <span class="badge ${statusClass}">
            ${universityStatus(university.status)}
          </span>
        </td>

        <td>
          <code class="folder-path">
            storage/universities/${escapeHtml(university.id)}/documentos
          </code>
        </td>

        <td>
          <div class="form-actions table-actions">
            <button
              class="button button-secondary button-small"
              data-admin="${escapeHtml(university.id)}">
              Criar administrador
            </button>

            <button
              class="button button-quiet button-small"
              data-edit="${escapeHtml(university.id)}">
              Editar
            </button>

            ${statusButton}

            <button
              class="button button-danger button-small"
              data-delete="${escapeHtml(university.id)}">
              Remover
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const reportRows = (state.report?.universities || []).map((university) => `
    <tr>
      <td>${escapeHtml(university.universityName)}</td>
      <td>${universityStatus(university.status)}</td>
      <td>${university.students}</td>
      <td>${university.rooms}</td>
      <td>${university.reservations}</td>
      <td>${university.studentsWaiting}</td>
    </tr>
  `).join('');

  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="/platform">
          <span class="brand-mark">U</span>
          <span>UniSalas<small>Administração principal</small></span>
        </a>

        <div class="top-actions">
          <span class="role-pill">Administrador principal</span>
          <button id="logout" class="button button-quiet button-small">
            Sair
          </button>
        </div>
      </header>

      <main class="main platform-main">
        <div class="page-head">
          <div>
            <span class="eyebrow">Painel da plataforma</span>
            <h1>Universidades</h1>
            <p>
              Cadastre universidades e seus domínios institucionais.
            </p>
          </div>

          <button id="refresh" class="button button-secondary">
            Atualizar
          </button>
        </div>

        ${
          state.message
            ? `<div class="status visible success">${escapeHtml(state.message)}</div>`
            : ''
        }

        <div class="grid platform-grid">
          <section class="card stat-card col-3">
            <div>
              <div class="stat-label">Universidades</div>
              <div class="stat-value">${totals.universities ?? 0}</div>
            </div>
            <span class="stat-icon">▦</span>
          </section>

          <section class="card stat-card col-3">
            <div>
              <div class="stat-label">Ativas</div>
              <div class="stat-value">${totals.activeUniversities ?? 0}</div>
            </div>
            <span class="stat-icon">✓</span>
          </section>

          <section class="card stat-card col-3">
            <div>
              <div class="stat-label">Alunos</div>
              <div class="stat-value">${totals.students ?? 0}</div>
            </div>
            <span class="stat-icon">♙</span>
          </section>

          <section class="card stat-card col-3">
            <div>
              <div class="stat-label">Reservas</div>
              <div class="stat-value">${totals.reservations ?? 0}</div>
            </div>
            <span class="stat-icon">▤</span>
          </section>

          <section class="card col-12">
            <div class="card-head">
              <div>
                <span class="eyebrow">Cadastro</span>
                <h2>Adicionar universidade</h2>
                <p>
                  Ela será ativada imediatamente. Não há solicitação,
                  aprovação ou envio de documentos.
                </p>
              </div>
            </div>

            <form id="university-form">
              <div class="fields">
                <div class="field">
                  <label for="university-name">
                    Nome da universidade
                  </label>
                  <input
                    id="university-name"
                    maxlength="150"
                    placeholder="Ex.: Universidade Central"
                    required>
                </div>

                <div class="field">
                  <label for="university-domains">
                    Domínios institucionais
                  </label>
                  <input
                    id="university-domains"
                    placeholder="universidade.edu.br, alunos.universidade.edu.br"
                    required>
                  <span class="hint">
                    Separe vários domínios por vírgula.
                  </span>
                </div>
              </div>

              <div class="form-actions">
                <button class="button button-primary">
                  Cadastrar universidade
                </button>
              </div>

              <div id="form-status" class="status" role="status"></div>
            </form>
          </section>

          <section class="card col-12">
            <div class="card-head">
              <div>
                <span class="eyebrow">Cadastro atual</span>
                <h2>Universidades cadastradas</h2>
                <p>
                  ${state.universities.length} instituição(ões).
                  A pasta de documentos é indicada para inclusão manual.
                </p>
              </div>
            </div>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Universidade</th>
                    <th>Domínios</th>
                    <th>Status</th>
                    <th>Pasta de documentos</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    universityRows ||
                    '<tr><td colspan="5">Nenhuma universidade cadastrada.</td></tr>'
                  }
                </tbody>
              </table>
            </div>
          </section>

          <section class="card col-12">
            <div class="card-head">
              <div>
                <span class="eyebrow">Acesso administrativo</span>
                <h2>Criar administrador universitário</h2>
                <p>
                  O administrador fica vinculado somente à universidade escolhida.
                </p>
              </div>
            </div>

            <form id="admin-form">
              <div class="fields">
                <div class="field">
                  <label for="admin-university">Universidade</label>
                  <select id="admin-university" required>
                    ${
                      universityOptions ||
                      '<option value="">Cadastre uma universidade primeiro</option>'
                    }
                  </select>
                </div>

                <div class="field">
                  <label for="admin-name">Nome do administrador</label>
                  <input id="admin-name" required>
                </div>

                <div class="field">
                  <label for="admin-email">E-mail institucional</label>
                  <input id="admin-email" type="email" required>
                </div>

                <div class="field">
                  <label for="admin-password">Senha inicial</label>
                  <input id="admin-password" type="password" minlength="8" required>
                </div>
              </div>

              <div class="form-actions">
                <button
                  class="button button-primary"
                  ${universityOptions ? '' : 'disabled'}>
                  Criar administrador
                </button>
              </div>
            </form>
          </section>

          <section class="card col-12">
            <div class="card-head">
              <div>
                <span class="eyebrow">Indicadores</span>
                <h2>Relatório consolidado</h2>
                <p>Resumo de alunos, salas, reservas e fila de espera.</p>
              </div>

              <button
                id="download-report"
                class="button button-secondary button-small">
                Baixar CSV
              </button>
            </div>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Universidade</th>
                    <th>Status</th>
                    <th>Alunos</th>
                    <th>Salas</th>
                    <th>Reservas</th>
                    <th>Fila de espera</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    reportRows ||
                    '<tr><td colspan="6">Ainda não há indicadores.</td></tr>'
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  `;

  document.getElementById('logout').onclick = () => {
    localStorage.removeItem(sessionKey);
    showLogin();
  };

  document.getElementById('refresh').onclick = async () => {
    state.message = '';
    await loadData();
  };

  document.getElementById('university-form').onsubmit = async (event) => {
    event.preventDefault();

    const status = document.getElementById('form-status');
    const name = document
      .getElementById('university-name')
      .value
      .trim();

    const domains = document
      .getElementById('university-domains')
      .value
      .split(/[\s,;]+/)
      .filter(Boolean);

    try {
      const result = await api('/platform/universities', {
        method: 'POST',
        body: JSON.stringify({ name, domains })
      });

      state.message =
        `${result.university.name} foi cadastrada e está ativa.`;

      await loadData();
    } catch (error) {
      status.textContent = error.message;
      status.className = 'status visible error';
    }
  };

  document.getElementById('admin-form').onsubmit = async (event) => {
    event.preventDefault();

    try {
      const universityId =
        document.getElementById('admin-university').value;

      await api(`/platform/universities/${universityId}/admins`, {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('admin-name').value,
          email: document.getElementById('admin-email').value,
          password: document.getElementById('admin-password').value
        })
      });

      alert('Administrador criado. Compartilhe a senha por um canal seguro.');
      event.target.reset();
    } catch (error) {
      alert(error.message);
    }
  };

  app.querySelectorAll('[data-admin]').forEach((button) => {
    button.onclick = () => {
      document.getElementById('admin-university').value =
        button.dataset.admin;

      document.getElementById('admin-form').scrollIntoView({
        behavior: 'smooth'
      });
      document.getElementById('admin-name').focus();
    };
  });

  app.querySelectorAll('[data-edit]').forEach((button) => {
    button.onclick = async () => {
      const university = state.universities.find(
        (item) => item.id === button.dataset.edit
      );

      const name = prompt(
        'Nome da universidade:',
        university.name
      );

      if (name === null) return;

      const domainsText = prompt(
        'Domínios separados por vírgula:',
        university.domains.join(', ')
      );

      if (domainsText === null) return;

      try {
        await api(`/platform/universities/${university.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            domains: domainsText.split(/[\s,;]+/).filter(Boolean),
            status: university.status
          })
        });

        state.message = 'Universidade atualizada.';
        await loadData();
      } catch (error) {
        alert(error.message);
      }
    };
  });

  app.querySelectorAll('[data-status]').forEach((button) => {
    button.onclick = async () => {
      const university = state.universities.find(
        (item) => item.id === button.dataset.id
      );

      try {
        await api(`/platform/universities/${university.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: university.name,
            domains: university.domains,
            status: button.dataset.status
          })
        });

        state.message = 'Status atualizado.';
        await loadData();
      } catch (error) {
        alert(error.message);
      }
    };
  });

  app.querySelectorAll('[data-delete]').forEach((button) => {
    button.onclick = async () => {
      if (!confirm('Remover a universidade e os acessos associados?')) {
        return;
      }

      try {
        await api(`/platform/universities/${button.dataset.delete}`, {
          method: 'DELETE'
        });

        state.message = 'Universidade removida.';
        await loadData();
      } catch (error) {
        alert(error.message);
      }
    };
  });

  document.getElementById('download-report').onclick = () => {
    const csv = [
      'Universidade;Status;Alunos;Salas;Reservas;Fila de espera',
      ...(state.report?.universities || []).map((university) => [
        university.universityName,
        universityStatus(university.status),
        university.students,
        university.rooms,
        university.reservations,
        university.studentsWaiting
      ].join(';'))
    ].join('\n');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(
      new Blob(['\ufeff' + csv], {
        type: 'text/csv;charset=utf-8'
      })
    );
    link.download = 'relatorio-plataforma-unisal.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };
}

if (getSession()) {
  await loadData();
} else {
  showLogin();
}