// Consumidor local com deduplicação em memória.
// Em produção, o identificador do evento deve ser persistido antes da confirmação.
export function makeNotificationConsumer({ deliveryProvider }) {
  const processed = new Set();

  return async function handle(event) {
    if (processed.has(event.id)) {
      return { status: 'duplicate' };
    }

    await deliveryProvider.send({
      id: event.id,
      tenantId: event.tenantId,
      type: event.type,
      ...event.payload
    });

    processed.add(event.id);
    return { status: 'delivered' };
  };
}