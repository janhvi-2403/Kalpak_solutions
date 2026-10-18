import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

@Injectable()
export class KeepAliveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeepAliveService.name);
  private timer?: NodeJS.Timeout;

  onModuleInit() {
    // Only schedule automatic keepalive in cloud environments (Render / production)
    const isCloud =
      process.env.RENDER === 'true' ||
      process.env.NODE_ENV === 'production' ||
      Boolean(process.env.RENDER_EXTERNAL_URL);

    if (!isCloud) {
      this.logger.log('KeepAliveService running in local development mode (no external pings required)');
      return;
    }

    const apiUrl = process.env.RENDER_EXTERNAL_URL
      ? `${process.env.RENDER_EXTERNAL_URL}/health`
      : 'https://kalpak-api.onrender.com/health';

    const webUrl = 'https://kalpak-web.onrender.com';

    this.logger.log(`KeepAliveService initialized. Scheduled heartbeat every 10 minutes to prevent Render idle sleep.`);

    // Run first ping after 2 minutes, then every 10 minutes (Render sleep threshold is 15 minutes)
    const PING_INTERVAL = 10 * 60 * 1000;

    const runPing = async () => {
      try {
        await Promise.allSettled([
          fetch(apiUrl, { method: 'GET', headers: { 'User-Agent': 'Kalpak-KeepAlive/1.0' } }),
          fetch(webUrl, { method: 'GET', headers: { 'User-Agent': 'Kalpak-KeepAlive/1.0' } }),
        ]);
        this.logger.debug(`[KeepAlive] Heartbeat pulse successfully sent to ${apiUrl} & ${webUrl}`);
      } catch (err: any) {
        this.logger.warn(`[KeepAlive] Heartbeat ping warning: ${err?.message || err}`);
      }
    };

    // Initial warm-up ping after 2 minutes
    setTimeout(runPing, 2 * 60 * 1000);

    // Recurring 10-minute heartbeat
    this.timer = setInterval(runPing, PING_INTERVAL);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
