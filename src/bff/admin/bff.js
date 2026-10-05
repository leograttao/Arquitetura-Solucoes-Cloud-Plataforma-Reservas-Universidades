export class AdminBff {
  constructor(reservationHandlers,catalogHandlers,universityHandlers) { this.reservations=reservationHandlers; this.catalog=catalogHandlers; this.universities=universityHandlers; }
  async listReservations(request) { return { status:200, body:{ items:await this.reservations.list(request) } }; }
  async listRooms(request) { return { status:200, body:{ items:await this.catalog.listRooms(request) } }; }
  async createRoom(request) { return {status:201,body:{room:await this.catalog.createRoom(request)}}; }
  async decideUniversity(request) { return {status:200,body:{university:await this.universities.decide(request)}}; }
}
