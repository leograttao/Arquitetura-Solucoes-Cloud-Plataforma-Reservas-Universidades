import { randomBytes } from 'node:crypto';
import { hashPassword as hashSecret } from '../security/passwords.js';

const copy = (value) => value == null ? value : structuredClone(value);
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
const normalizeDomain = (value) =>
  String(value ?? '').trim().toLowerCase().replace(/^@/, '');

export class MemoryIdentityStore {
  #universities = new Map();
  #users = new Map();
  #emailIndex = new Map();
  #verificationCodes = new Map();
  #sessions = new Map();
  #universityDocuments = new Map();

  constructor() {
    const email = process.env.PLATFORM_ADMIN_EMAIL || 'admin@unisal.local';
    const password = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

    const root = {
      id: 'platform-admin-1',
      name: 'Administrador principal',
      email: normalizeEmail(email),
      passwordHash: hashSecret(password),
      role: 'platform-admin',
      tenantId: 'platform',
      status: 'active',
      emailVerifiedAt: new Date().toISOString()
    };

    this.#users.set(root.id, root);
    this.#emailIndex.set(root.email, root.id);
  }

  async listUniversities({ search = '', activeOnly = false } = {}) {
    const term = String(search).trim().toLowerCase();

    return [...this.#universities.values()]
      .filter((item) => !activeOnly || item.status === 'active')
      .filter((item) =>
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.domains.some((domain) => domain.includes(term))
      )
      .map(copy);
  }

  async findUniversity(id) {
    return copy(this.#universities.get(id) ?? null);
  }

  async find(id) {
    return this.findUniversity(id);
  }

  async list() {
    return this.listUniversities({ activeOnly: false });
  }

  async listUsers(tenantId) {
    return [...this.#users.values()]
      .filter((user) => tenantId == null || user.tenantId === tenantId)
      .map(({ passwordHash, ...user }) => copy(user));
  }

  async saveUniversity(university) {
    const domains = [
      ...new Set(
        (university.domains ?? [])
          .map(normalizeDomain)
          .filter(Boolean)
      )
    ];

    if (domains.length === 0) {
      throw new Error('Cadastre pelo menos um domínio institucional.');
    }

    for (const current of this.#universities.values()) {
      const domainAlreadyUsed = current.domains.some(
        (domain) => domains.includes(domain)
      );

      if (current.id !== university.id && domainAlreadyUsed) {
        throw new Error('Um dos domínios já está associado a outra universidade.');
      }
    }

    const saved = { ...university, domains };
    this.#universities.set(saved.id, copy(saved));
    return copy(saved);
  }

  async submitUniversityRequest(university, documents) {
    const saved = await this.saveUniversity(university);
    this.#universityDocuments.set(saved.id, copy(documents));
    return saved;
  }

  async listUniversityDocuments(id) {
    return copy(this.#universityDocuments.get(id) ?? []);
  }

  async decideUniversityRequest(id, decision, note = '') {
    const current = this.#universities.get(id);

    if (!current || current.status !== 'pending') {
      return null;
    }

    const now = new Date().toISOString();
    const next = {
      ...current,
      status: decision === 'approve' ? 'active' : 'rejected',
      reviewNote: String(note).trim(),
      reviewedAt: now,
      updatedAt: now
    };

    this.#universities.set(id, copy(next));
    return copy(next);
  }

  async save(university) {
    return this.saveUniversity(university);
  }

  async deleteUniversity(id) {
    if (!this.#universities.has(id)) {
      return false;
    }

    this.#universities.delete(id);
    this.#universityDocuments.delete(id);

    for (const [userId, user] of this.#users) {
      if (user.tenantId === id) {
        this.#users.delete(userId);
        this.#emailIndex.delete(user.email);

        for (const [token, session] of this.#sessions) {
          if (session.sub === userId) {
            this.#sessions.delete(token);
          }
        }
      }
    }

    return true;
  }

  async findUserByEmail(email) {
    const id = this.#emailIndex.get(normalizeEmail(email));
    return id ? copy(this.#users.get(id)) : null;
  }

  async findUser(id) {
    return copy(this.#users.get(id) ?? null);
  }

  async saveUser(user) {
    const email = normalizeEmail(user.email);
    const existingId = this.#emailIndex.get(email);

    if (existingId && existingId !== user.id) {
      throw new Error('Este e-mail já possui cadastro.');
    }

    const saved = { ...user, email };
    this.#users.set(saved.id, copy(saved));
    this.#emailIndex.set(email, saved.id);
    return copy(saved);
  }

  async listStudents(tenantId) {
    return [...this.#users.values()]
      .filter(
        (user) =>
          user.tenantId === tenantId &&
          user.role === 'student'
      )
      .map(({ passwordHash, ...user }) => copy(user));
  }

  async deleteStudent(tenantId, id) {
    const user = this.#users.get(id);

    if (
      !user ||
      user.tenantId !== tenantId ||
      user.role !== 'student'
    ) {
      return false;
    }

    this.#users.delete(id);
    this.#emailIndex.delete(user.email);

    for (const [token, session] of this.#sessions) {
      if (session.sub === id) {
        this.#sessions.delete(token);
      }
    }

    return true;
  }

  async createVerificationCode(userId) {
    const code = randomBytes(4)
      .readUInt32BE(0)
      .toString()
      .slice(0, 6)
      .padStart(6, '0');

    this.#verificationCodes.set(userId, {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000
    });

    return code;
  }

  async verifyCode(userId, code) {
    const challenge = this.#verificationCodes.get(userId);

    if (
      !challenge ||
      challenge.expiresAt < Date.now() ||
      challenge.code !== String(code).trim()
    ) {
      return false;
    }

    this.#verificationCodes.delete(userId);
    return true;
  }

  async createSession(user) {
    const token = randomBytes(32).toString('hex');

    const principal = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name,
      email: user.email
    };

    this.#sessions.set(token, {
      ...principal,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000
    });

    return { token, principal };
  }

  async findSession(token) {
    const session = this.#sessions.get(token);

    if (!session || session.expiresAt <= Date.now()) {
      this.#sessions.delete(token);
      return null;
    }

    const { expiresAt, ...principal } = session;
    return copy(principal);
  }

  async revokeSession(token) {
    return this.#sessions.delete(token);
  }
}