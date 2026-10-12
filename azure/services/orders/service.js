export function createOrderService({ repository = new MemoryOrderRepository() } = {}) {
  return async ({ method, id, body }) => {
    if (method === 'GET') return id ? repository.get(id) : repository.list();
    if (method === 'POST') return repository.create(body || {});
    if (method === 'PUT' || method === 'PATCH') return repository.update(id, body || {});
    if (method === 'DELETE') return repository.remove(id);
    throw new Error('Method not allowed');
  };
}
export class MemoryOrderRepository {
  #items = new Map(); #next = 1;
  list() { return [...this.#items.values()]; } get(id) { return this.#items.get(id) || null; }
  create(input) { const item = { id: String(this.#next++), status: 'created', ...input, createdAt: new Date().toISOString() }; this.#items.set(item.id, item); return item; }
  update(id, input) { if (!this.#items.has(id)) return null; const item = { ...this.#items.get(id), ...input, id }; this.#items.set(id, item); return item; }
  remove(id) { return this.#items.delete(id); }
}
export class AzureSqlOrderRepository extends MemoryOrderRepository {
  constructor(connectionString = process.env.AZURE_SQL_CONNECTION_STRING) {
    super();
    this.mode = connectionString ? 'azure-sql' : 'memory-demo-fallback';
    this.connectionStringConfigured = Boolean(connectionString);
    this.connectionString = connectionString;
    this.pool = null;
  }

  async connect() {
    if (!this.connectionString) return false;
    if (!this.pool) {
      const sql = await import('mssql');
      this.pool = await sql.connect(this.connectionString);
    }
    return true;
  }

  async list() {
    if (!(await this.connect())) return super.list();
    const result = await this.pool.request().query(
      'SELECT id, status, quantity, unitPrice, createdAt FROM orders'
    );
    return result.recordset;
  }

  async get(id) {
    if (!(await this.connect())) return super.get(id);
    const result = await this.pool.request()
      .input('id', id)
      .query('SELECT id, status, quantity, unitPrice, createdAt FROM orders WHERE id = @id');
    return result.recordset[0] || null;
  }

  async create(input) {
    if (!(await this.connect())) return super.create(input);
    const id = crypto.randomUUID();
    const status = input.status || 'created';
    const createdAt = new Date().toISOString();
    await this.pool.request()
      .input('id', id)
      .input('status', status)
      .input('quantity', Number(input.quantity || 1))
      .input('unitPrice', Number(input.unitPrice || 0))
      .input('createdAt', createdAt)
      .query('INSERT INTO orders (id, status, quantity, unitPrice, createdAt) VALUES (@id, @status, @quantity, @unitPrice, @createdAt)');
    return { id, ...input, status, createdAt };
  }

  async update(id, input) {
    if (!(await this.connect())) return super.update(id, input);
    const current = await this.get(id);
    if (!current) return null;
    const next = { ...current, ...input, id };
    await this.pool.request()
      .input('id', id)
      .input('status', next.status)
      .input('quantity', Number(next.quantity || 1))
      .input('unitPrice', Number(next.unitPrice || 0))
      .query('UPDATE orders SET status = @status, quantity = @quantity, unitPrice = @unitPrice WHERE id = @id');
    return next;
  }

  async remove(id) {
    if (!(await this.connect())) return super.remove(id);
    const result = await this.pool.request()
      .input('id', id)
      .query('DELETE FROM orders WHERE id = @id');
    return result.rowsAffected[0] === 1;
  }
}

import crypto from 'node:crypto';
