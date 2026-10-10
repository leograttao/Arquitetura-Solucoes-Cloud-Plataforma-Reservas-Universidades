export class ApiGateway {
  constructor({
    verifier,
    studentBff,
    adminBff,
    authBff,
    platformBff
  }) {
    Object.assign(this, {
      verifier,
      studentBff,
      adminBff,
      authBff,
      platformBff
    });
  }

  async handle(request) {
    try {
      const path = request.path;

      // Rotas públicas de consulta e autenticação.
      if (
        path === '/universities' &&
        request.method === 'GET'
      ) {
        return this.platformBff.publicUniversities({
          query: request.query
        });
      }

      if (
        path === '/auth/login' &&
        request.method === 'POST'
      ) {
        return this.authBff.login({
          body: request.body
        });
      }

      if (
        path === '/auth/students' &&
        request.method === 'POST'
      ) {
        return this.authBff.registerStudent({
          body: request.body
        });
      }

      if (
        path === '/auth/students/verify' &&
        request.method === 'POST'
      ) {
        return this.authBff.verifyStudent({
          body: request.body
        });
      }

      const principal = await this.verifier(request);

      if (
        path === '/auth/me' &&
        request.method === 'GET'
      ) {
        return {
          status: 200,
          body: { user: principal }
        };
      }

      if (
        path === '/auth/logout' &&
        request.method === 'POST'
      ) {
        const authorization = request.headers?.authorization ?? '';
        const token = authorization.startsWith('Bearer ')
          ? authorization.slice(7)
          : '';

        return this.authBff.logout({ token });
      }

      // Rotas exclusivas do administrador principal.
      if (principal.role === 'platform-admin') {
        if (
          path === '/platform/reports' &&
          request.method === 'GET'
        ) {
          return this.platformBff.report({ principal });
        }

        if (
          path === '/platform/universities' &&
          request.method === 'GET'
        ) {
          return this.platformBff.listUniversities({ principal });
        }

        if (
          path === '/platform/universities' &&
          request.method === 'POST'
        ) {
          return this.platformBff.createUniversity({
            principal,
            body: request.body
          });
        }

        const adminMatch = path.match(
          /^\/platform\/universities\/([^/]+)\/admins$/
        );

        if (
          adminMatch &&
          request.method === 'POST'
        ) {
          return this.platformBff.createUniversityAdmin({
            principal,
            params: { id: adminMatch[1] },
            body: request.body
          });
        }

        const universityMatch = path.match(
          /^\/platform\/universities\/([^/]+)$/
        );

        if (
          universityMatch &&
          request.method === 'PUT'
        ) {
          return this.platformBff.updateUniversity({
            principal,
            params: { id: universityMatch[1] },
            body: request.body
          });
        }

        if (
          universityMatch &&
          request.method === 'DELETE'
        ) {
          return this.platformBff.removeUniversity({
            principal,
            params: { id: universityMatch[1] }
          });
        }
      }

      // Rotas do estudante.
      if (
        path === '/student/reservations' &&
        request.method === 'POST' &&
        principal.role === 'student'
      ) {
        return this.studentBff.createReservation({
          principal,
          body: request.body
        });
      }

      if (
        path === '/student/reservations' &&
        request.method === 'GET' &&
        principal.role === 'student'
      ) {
        return this.studentBff.listReservations({ principal });
      }

      if (
        path === '/student/waitlist' &&
        request.method === 'GET' &&
        principal.role === 'student'
      ) {
        return this.studentBff.listWaitlist({ principal });
      }

      if (
        path === '/student/rooms' &&
        request.method === 'GET' &&
        principal.role === 'student'
      ) {
        return this.studentBff.listRooms({ principal });
      }

      if (
        path === '/student/availability' &&
        request.method === 'GET' &&
        principal.role === 'student'
      ) {
        return this.studentBff.checkAvailability({
          principal,
          query: request.query
        });
      }

      const cancelMatch = path.match(
        /^\/student\/reservations\/([^/]+)$/
      );

      if (
        cancelMatch &&
        request.method === 'DELETE' &&
        principal.role === 'student'
      ) {
        return this.studentBff.cancelReservation({
          principal,
          params: { id: cancelMatch[1] }
        });
      }

      // Rotas do administrador da universidade.
      if (
        path === '/admin/reservations' &&
        request.method === 'GET' &&
        principal.role === 'admin'
      ) {
        return this.adminBff.listReservations({ principal });
      }

      if (
        path === '/admin/reports' &&
        request.method === 'GET' &&
        principal.role === 'admin'
      ) {
        return this.adminBff.report({ principal });
      }

      if (
        path === '/admin/rooms' &&
        request.method === 'GET' &&
        principal.role === 'admin'
      ) {
        return this.adminBff.listRooms({ principal });
      }

      if (
        path === '/admin/rooms' &&
        request.method === 'POST' &&
        principal.role === 'admin'
      ) {
        return this.adminBff.createRoom({
          principal,
          body: request.body
        });
      }

      if (
        path === '/admin/students' &&
        request.method === 'GET' &&
        principal.role === 'admin'
      ) {
        return this.adminBff.listStudents({ principal });
      }

      if (
        path === '/admin/university' &&
        request.method === 'GET' &&
        principal.role === 'admin'
      ) {
        return this.adminBff.getUniversity({ principal });
      }

      const studentMatch = path.match(
        /^\/admin\/students\/([^/]+)$/
      );

      if (
        studentMatch &&
        request.method === 'DELETE' &&
        principal.role === 'admin'
      ) {
        return this.adminBff.removeStudent({
          principal,
          params: { id: studentMatch[1] }
        });
      }

      if (
        path === '/admin/university/domains' &&
        request.method === 'PUT' &&
        principal.role === 'admin'
      ) {
        return this.adminBff.updateDomains({
          principal,
          body: request.body
        });
      }

      return {
        status: 404,
        body: { error: 'Rota não encontrada.' }
      };
    } catch (error) {
      return {
        status: error.statusCode ?? 400,
        body: { error: error.message }
      };
    }
  }
}