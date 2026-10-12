import crypto from 'node:crypto';

export function createProductService({ repository = new MemoryProductRepository() } = {}) {
  return async ({ method, id, body }) => {
    if (method === 'GET') return id ? repository.get(id) : repository.list();
    if (method === 'POST') return repository.create(body || {});
    if (method === 'PUT' || method === 'PATCH') return repository.update(id, body || {});
    if (method === 'DELETE') return repository.remove(id);
    throw new Error('Method not allowed');
  };
}

export class MemoryProductRepository {
  #items = new Map();
  #next = 1;
  list() { return [...this.#items.values()]; }
  get(id) { return this.#items.get(id) || null; }
  create(input) { const item = { id: String(this.#next++), ...input, createdAt: new Date().toISOString() }; this.#items.set(item.id, item); return item; }
  update(id, input) { if (!this.#items.has(id)) return null; const item = { ...this.#items.get(id), ...input, id }; this.#items.set(id, item); return item; }
  remove(id) { return this.#items.delete(id); }
}

export class MongoAtlasProductRepository extends MemoryProductRepository {
  constructor(uri = process.env.MONGODB_ATLAS_URI) {
    super();
    this.mode = uri ? 'mongo-atlas' : 'memory-demo-fallback';
    this.connectionStringConfigured = Boolean(uri);
    this.uri = uri;
    this.client = null;
    this.collection = null;
  }

  async connect() {
    if (!this.uri) return false;
    if (!this.collection) {
      const { MongoClient } = await import('mongodb');
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      const database = this.client.db(
        process.env.MONGODB_DATABASE || 'pjbl'
      );
      this.collection = database.collection(
        process.env.MONGODB_PRODUCTS_COLLECTION || 'products'
      );
    }
    return true;
  }

  async list() {
    if (!(await this.connect())) return super.list();
    return this.collection.find({}).toArray();
  }

  async get(id) {
    if (!(await this.connect())) return super.get(id);
    return this.collection.findOne({ id });
  }

  async create(input) {
    if (!(await this.connect())) return super.create(input);
    const item = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString()
    };
    await this.collection.insertOne(item);
    return item;
  }

  async update(id, input) {
    if (!(await this.connect())) return super.update(id, input);
    const result = await this.collection.findOneAndUpdate(
      { id },
      { $set: input },
      { returnDocument: 'after' }
    );
    return result.value;
  }

  async remove(id) {
    if (!(await this.connect())) return super.remove(id);
    const result = await this.collection.deleteOne({ id });
    return result.deletedCount === 1;
  }
}
