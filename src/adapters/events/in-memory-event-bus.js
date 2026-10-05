export class InMemoryEventBus {
  #events=[]; #handlers=new Map();
  subscribe(type,handler) { const list=this.#handlers.get(type) ?? []; list.push(handler); this.#handlers.set(type,list); }
  async publish(event) { this.#events.push(structuredClone(event)); for(const handler of this.#handlers.get(event.type) ?? []) await handler(structuredClone(event)); }
  history() { return structuredClone(this.#events); }
}
