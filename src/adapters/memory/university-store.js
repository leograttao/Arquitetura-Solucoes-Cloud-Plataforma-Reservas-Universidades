import { UniversityRepository } from '../../ports/university-repository.js';

export class MemoryUniversityStore extends UniversityRepository {
  #items = new Map();

  constructor() {
    super();
  }

  async save(item) {
    const domainAlreadyExists = [...this.#items.values()]
      .some(university =>
        university.primaryDomain === item.primaryDomain &&
        university.id !== item.id
      );

    if (domainAlreadyExists) {
      throw new Error('Domínio já cadastrado.');
    }

    this.#items.set(item.id, structuredClone(item));

    return structuredClone(item);
  }

  async find(id) {
    const university = this.#items.get(id);

    return university
      ? structuredClone(university)
      : null;
  }

  async list() {
    return [...this.#items.values()]
      .map(university => structuredClone(university));
  }
}