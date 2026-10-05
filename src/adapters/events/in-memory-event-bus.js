import { EventPublisher } from '../../ports/event-publisher.js';

export class InMemoryEventBus extends EventPublisher {
  #events = [];
  #handlers = new Map();

  constructor() {
    super();
  }
  subscribe(type,handler) { const list=this.#handlers.get(type) ?? []; list.push(handler); this.#handlers.set(type,list); }
  async publish(event) { this.#events.push(structuredClone(event)); for(const handler of this.#handlers.get(event.type) ?? []) await handler(structuredClone(event)); }
  history() { return structuredClone(this.#events); }
}
