// Contrato pertence ao núcleo da aplicação; cada serviço implementa o seu adaptador.
export class ReservationRepository {
  async createIfAvailable(_reservation) { throw new Error('Not implemented'); }
  async findById(_tenantId, _id) { throw new Error('Not implemented'); }
  async cancel(_tenantId, _id) { throw new Error('Not implemented'); }
}
