export class PlatformBff {
  constructor(identityHandlers, reportHandlers) {
    this.identity = identityHandlers;
    this.reports = reportHandlers;
  }

  async listUniversities(request) {
    return {
      status: 200,
      body: {
        items: await this.identity.listAllUniversities(request)
      }
    };
  }

  async publicUniversities(request) {
    return {
      status: 200,
      body: {
        items: await this.identity.listUniversities(request)
      }
    };
  }

  async createUniversity(request) {
    return {
      status: 201,
      body: {
        university: await this.identity.createUniversity(request)
      }
    };
  }

  async updateUniversity(request) {
    return {
      status: 200,
      body: {
        university: await this.identity.updateUniversity(request)
      }
    };
  }

  async removeUniversity(request) {
    return {
      status: 200,
      body: await this.identity.removeUniversity(request)
    };
  }

  async createUniversityAdmin(request) {
    return {
      status: 201,
      body: {
        administrator: await this.identity.createUniversityAdmin(request)
      }
    };
  }

  async report(request) {
    return {
      status: 200,
      body: await this.reports.platform(request)
    };
  }
}