export class AdminBff {
  constructor(
    reservationHandlers,
    catalogHandlers,
    universityHandlers,
    identityHandlers,
    reportHandlers
  ) {
    this.reservations = reservationHandlers;
    this.catalog = catalogHandlers;
    this.universities = universityHandlers;
    this.identity = identityHandlers;
    this.reports = reportHandlers;
  }

  async listReservations(request) {
    return {
      status: 200,
      body: {
        items: await this.reservations.list(request)
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

  async createRoom(request) {
    return {
      status: 201,
      body: {
        room: await this.catalog.createRoom(request)
      }
    };
  }

  async decideUniversity(request) {
    return {
      status: 200,
      body: {
        university: await this.universities.decide(request)
      }
    };
  }

  async listStudents(request) {
    return {
      status: 200,
      body: {
        items: await this.identity.listStudents(request)
      }
    };
  }

  async getUniversity(request) {
    return {
      status: 200,
      body: {
        university: await this.identity.getOwnUniversity(request)
      }
    };
  }

  async removeStudent(request) {
    return {
      status: 200,
      body: await this.identity.removeStudent(request)
    };
  }

  async updateDomains(request) {
    return {
      status: 200,
      body: {
        university: await this.identity.updateDomains(request)
      }
    };
  }

  async report(request) {
    return {
      status: 200,
      body: await this.reports.university(request)
    };
  }
}