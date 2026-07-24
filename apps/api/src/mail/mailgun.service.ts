import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: string[];
}

export interface SendEmailResult {
  id: string;
  to: string;
  redirectedTo?: string;
  dryRun: boolean;
}

@Injectable()
export class MailgunService {
  private readonly logger = new Logger(MailgunService.name);

  isConfigured() {
    return Boolean(
      process.env.MAILGUN_API_KEY &&
      process.env.MAILGUN_DOMAIN &&
      process.env.MAILGUN_FROM,
    );
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const testTo = process.env.MAILGUN_TEST_TO?.trim();
    const dryRun = process.env.MAILGUN_DRY_RUN === 'true';
    const actualTo = testTo || input.to;
    const subject = testTo
      ? `[test→${input.to}] ${input.subject}`
      : input.subject;

    if (dryRun || !this.isConfigured()) {
      if (!dryRun && !this.isConfigured()) {
        throw new ServiceUnavailableException('Mailgun is not configured');
      }
      const id = `dry-run-${Date.now()}`;
      this.logger.log(
        `Dry-run email to=${actualTo} intended=${input.to} subject=${subject}`,
      );
      return {
        id,
        to: input.to,
        redirectedTo: testTo || undefined,
        dryRun: true,
      };
    }

    const params = new URLSearchParams({
      from: process.env.MAILGUN_FROM!,
      to: actualTo,
      subject,
      html: input.html,
      text: input.text || stripHtml(input.html),
    });
    if (input.replyTo) {
      params.set('h:Reply-To', input.replyTo);
    }
    for (const tag of input.tags || []) {
      params.append('o:tag', tag);
    }

    const domain = process.env.MAILGUN_DOMAIN!;
    const auth = Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString(
      'base64',
    );
    const response = await fetch(
      `https://api.mailgun.net/v3/${domain}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Mailgun error ${response.status}: ${body}`);
      throw new ServiceUnavailableException(
        `Mailgun send failed (${response.status})`,
      );
    }

    const payload = (await response.json()) as { id?: string };
    return {
      id: payload.id || `mailgun-${Date.now()}`,
      to: input.to,
      redirectedTo: testTo || undefined,
      dryRun: false,
    };
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
