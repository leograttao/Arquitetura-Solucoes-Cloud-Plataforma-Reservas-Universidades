import { makeNotificationConsumer } from './consumer.js';

export function subscribeNotifications({
  events,
  identity,
  reservations,
  deliveryProvider,
  log = console.error
}) {
  const deliver = makeNotificationConsumer({ deliveryProvider });
  const inFlight = new Set();

  const notify = async (event) => {
    try {
      const payload = event.payload ?? {};
      let recipient = payload.email;
      let subject = 'Atualização da UniSalas';
      let text = 'Há uma atualização sobre sua universidade.';

      if (
        event.type === 'UniversityApproved' ||
        event.type === 'UniversityRejected'
      ) {
        recipient = payload.email;

        subject = event.type === 'UniversityApproved'
          ? 'Cadastro da universidade aprovado'
          : 'Cadastro da universidade analisado';

        text = event.type === 'UniversityApproved'
          ? `Olá! A solicitação de ${payload.name} foi aprovada. A equipe da plataforma poderá criar o acesso administrativo da universidade.`
          : `Olá! A solicitação de ${payload.name} não foi aprovada. Motivo: ${payload.note || 'consulte a equipe da plataforma.'}`;
      } else if (event.type === 'StudentVerificationRequested') {
        recipient = payload.email;
        subject = 'Confirme seu e-mail institucional';
        text = `Olá, ${payload.name}! Seu código de validação é ${payload.code}. Ele expira em 15 minutos.`;
      } else {
        const user = await identity.findUser(payload.actorId);
        recipient = user?.email;

        if (event.type === 'WaitlistJoined') {
          subject = 'Você entrou na fila de espera';
          text = 'Sua solicitação foi registrada. Enviaremos outro e-mail automaticamente quando uma vaga for liberada.';
        } else if (event.type === 'ReservationPromoted') {
          subject = 'Uma vaga foi liberada para você';
          text = `Sua reserva foi confirmada automaticamente para ${payload.startsAt}. Acesse http://localhost:8080/student para ver os detalhes.`;
        } else if (event.type === 'ReservationConfirmed') {
          subject = 'Reserva confirmada';
          text = `Sua reserva foi confirmada para ${payload.startsAt}. Acesse http://localhost:8080/student para ver os detalhes.`;
        } else if (event.type === 'ReservationCancelled') {
          const reservation = await reservations.findById(
            event.tenantId,
            payload.reservationId
          );

          const owner = reservation
            ? await identity.findUser(reservation.actorId)
            : null;

          recipient = owner?.email;
          subject = 'Reserva cancelada';
          text = 'Sua reserva foi cancelada. A fila de espera, se houver, foi atualizada.';
        }
      }

      if (recipient) {
        await deliver({
          id: event.id,
          tenantId: event.tenantId,
          type: event.type,
          payload: {
            to: recipient,
            subject,
            text
          }
        });
      }
    } catch (error) {
      log(
        `[Notificações] Evento ${event.type} aguardando nova tentativa: ${error.message}`
      );
    }
  };

  const eventTypes = [
    'UniversityApproved',
    'UniversityRejected',
    'StudentVerificationRequested',
    'WaitlistJoined',
    'ReservationPromoted',
    'ReservationConfirmed',
    'ReservationCancelled'
  ];

  for (const type of eventTypes) {
    events.subscribe(type, (event) => {
      if (inFlight.has(event.id)) {
        return;
      }

      inFlight.add(event.id);

      queueMicrotask(async () => {
        try {
          await notify(event);
        } finally {
          inFlight.delete(event.id);
        }
      });
    });
  }
}