export class ApiGateway {
  constructor({ verifier, studentBff, adminBff, universityHandlers }) { Object.assign(this,{verifier,studentBff,adminBff,universityHandlers}); }
  async handle(request) {
    try {
      if(request.path==='/universities'&&request.method==='POST') return {status:201,body:{university:await this.universityHandlers.register({body:request.body})}};
      const principal=await this.verifier(request), path=request.path;
      if(path==='/student/reservations'&&request.method==='POST'&&principal.role==='student')return await this.studentBff.createReservation({principal,body:request.body});
      if(path==='/student/availability'&&request.method==='GET'&&principal.role==='student')return await this.studentBff.checkAvailability({principal,query:request.query});
      const cancel=path.match(/^\/student\/reservations\/([^/]+)$/);if(cancel&&request.method==='DELETE'&&principal.role==='student')return await this.studentBff.cancelReservation({principal,params:{id:cancel[1]}});
      if(path==='/admin/reservations'&&request.method==='GET'&&['admin','platform-admin'].includes(principal.role))return await this.adminBff.listReservations({principal});
      if(path==='/admin/rooms'&&request.method==='GET'&&principal.role==='admin')return await this.adminBff.listRooms({principal});
      if(path==='/admin/rooms'&&request.method==='POST'&&principal.role==='admin')return await this.adminBff.createRoom({principal,body:request.body});
      const decision=path.match(/^\/platform\/universities\/([^/]+)\/decision$/);if(decision&&request.method==='POST'&&principal.role==='platform-admin')return await this.adminBff.decideUniversity({principal,params:{id:decision[1]},body:request.body});
      return {status:404,body:{error:'Rota não encontrada.'}};
    } catch(e) { return {status:e.statusCode??400,body:{error:e.message}}; }
  }
}
