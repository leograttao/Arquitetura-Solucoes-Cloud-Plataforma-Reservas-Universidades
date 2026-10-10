export class AuthBff {
  constructor(identityHandlers) {
    this.identity = identityHandlers;
  }

  async login(request) {
    return {
      status: 200,
      body: await this.identity.login(request)
    };
  }

  async registerStudent(request) {
    return {
      status: 201,
      body: await this.identity.registerStudent(request)
    };
  }

  async verifyStudent(request) {
    return {
      status: 200,
      body: await this.identity.verifyStudent(request)
    };
  }

  async logout(request) {
    return {
      status: 200,
      body: {
        loggedOut: await this.identity.logout(request)
      }
    };
  }
}