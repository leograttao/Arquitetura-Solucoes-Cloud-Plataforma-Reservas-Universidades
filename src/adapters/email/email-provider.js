export function makeEmailProvider({ fetchImpl = fetch, log = console.log } = {}) {
  return {
    async send({ to, subject, text }) {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.RESEND_FROM_EMAIL;

      if (!apiKey || !from) {
        log(`[E-mail de demonstração] Para: ${to} | Assunto: ${subject}\n${text}`);
        return { delivered: false, mode: 'console' };
      }

      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text
        })
      });

      if (!response.ok) {
        throw new Error(`Falha ao enviar e-mail (provedor: ${response.status}).`);
      }

      return { delivered: true, mode: 'resend' };
    }
  };
}