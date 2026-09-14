import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { StockQuote } from '../../../1_entities/market/StockQuote';
import { IIntradayMarketDataCache } from '../../../2_use_cases/market/get_batch_market_data/IBatchMarketDataGateway';

@Injectable()
export class RedisCacheGatewayImpl
  implements IIntradayMarketDataCache, OnModuleDestroy
{
  private readonly client: RedisClientType;

  constructor(host: string, port: number, password?: string) {
    this.client = createClient({ socket: { host, port }, password });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }

  async getIntraday(symbol: string): Promise<StockQuote[] | null> {
    await this.ensureConnected();
    const value = await this.client.get(this.key(symbol));
    if (!value) return null;

    return (JSON.parse(value) as Array<Record<string, unknown>>).map(
      (quote) =>
        new StockQuote(
          String(quote.symbol),
          String(quote.companyName),
          Number(quote.currentPrice),
          Number(quote.openPrice),
          Number(quote.closePrice),
          new Date(String(quote.marketTimestamp)),
          new Date(String(quote.fetchedAt)),
          Number(quote.high),
          Number(quote.low),
          Number(quote.volume),
          '5m',
        ),
    );
  }

  async saveIntraday(symbol: string, quotes: StockQuote[]): Promise<void> {
    if (quotes.length === 0) return;
    await this.ensureConnected();
    const latestTimestamp = quotes.reduce(
      (latest, quote) =>
        quote.marketTimestamp > latest ? quote.marketTimestamp : latest,
      quotes[0].marketTimestamp,
    );
    await this.client.set(this.key(symbol), JSON.stringify(quotes), {
      EX: RedisCacheGatewayImpl.calculateTtl(latestTimestamp),
    });
  }

  static calculateTtl(timestamp: Date): number {
    const hours = timestamp.getUTCDay() === 5 ? 72 : 24;
    return hours * 60 * 60;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client.isOpen) await this.client.connect();
  }

  private key(symbol: string): string {
    return `market:intraday:${symbol.toUpperCase()}:5m`;
  }
}
