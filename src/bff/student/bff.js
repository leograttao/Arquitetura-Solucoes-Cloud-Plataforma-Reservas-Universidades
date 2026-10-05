export class StudentBff {
  constructor(reservationHandlers,catalogHandlers) { this.reservations=reservationHandlers; this.catalog=catalogHandlers; }
  async checkAvailability(request) { return {status:200,body:await this.catalog.checkAvailability(request)}; }
  async createReservation(request) { const result=await this.reservations.create(request); return result.outcome==='confirmed' ? { status:201, body:{ message:'Reserva confirmada.', reservation:result.reservation } } : { status:202, body:{ message:'Você entrou na fila de espera.', waitlist:result.waitlist } }; }
  async cancelReservation(request) { return { status:200, body:{ reservation:await this.reservations.cancel(request) } }; }
}
