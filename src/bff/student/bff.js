export class StudentBff {
  constructor(reservationHandlers, catalogHandlers) {
    this.reservations = reservationHandlers;
    this.catalog = catalogHandlers;
  }

  async checkAvailability(request) {
    const [room, slot] = await Promise.all([
      this.catalog.checkAvailability(request),
      this.reservations.isAvailable(request)
    ]);

    return {
      status: 200,
      body: {
        ...room,
        available: room.available && slot.available
      }
    };
  }

  async listRooms(request) {
    return {
      status: 200,
      body: {
        items: await this.catalog.listRooms(request)
      }
    };
  }

  async listReservations(request) {
    return {
      status: 200,
      body: {
        items: await this.reservations.listMine(request)
      }
    };
  }

  async listWaitlist(request) {
    return {
      status: 200,
      body: {
        items: await this.reservations.listMineWaitlist(request)
      }
    };
  }

  async createReservation(request) {
    const result = await this.reservations.create(request);

    if (result.outcome === 'confirmed') {
      return {
        status: 201,
        body: {
          message: 'Reserva confirmada.',
          reservation: result.reservation
        }
      };
    }

    return {
      status: 202,
      body: {
        message: 'Você entrou na fila de espera.',
        waitlist: result.waitlist
      }
    };
  }

  async cancelReservation(request) {
    return {
      status: 200,
      body: {
        reservation: await this.reservations.cancel(request)
      }
    };
  }
}