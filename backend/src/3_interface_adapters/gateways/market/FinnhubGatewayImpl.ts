// src/3_interface_adapters/gateways/market/FinnhubGatewayImpl.ts
import { IStockMarketQueryGateway } from '../../../2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { StockQuote } from '../../../1_entities/market/StockQuote';

interface FinnhubQuoteResponse {
  c: number;
  d: number | null;
  o: number;
  h?: number;
  l?: number;
  v?: number;
  pc: number;
  t: number;
}

export class FinnhubGatewayImpl implements IStockMarketQueryGateway {
  private readonly baseUrl = 'https://finnhub.io/api/v1';

  constructor(private readonly apiKey: string) {
    if (!this.apiKey) {
      throw new Error('FINNHUB_API_KEY is required');
    }
  }

  public async getQuote(symbol: string): Promise<StockQuote> {
    const response = await fetch(
      `${this.baseUrl}/quote?symbol=${symbol}&token=${this.apiKey}`,
    );

    if (!response.ok)
      throw new Error(`Finnhub HTTP Error: ${response.statusText}`);

    const data = (await response.json()) as FinnhubQuoteResponse;

    if (data.c === 0 && data.d === null)
      throw new Error(`Symbol ${symbol} not found on Finnhub`);

    return new StockQuote(
      symbol.toUpperCase(),
      symbol.toUpperCase(),
      data.c,
      data.o,
      data.pc,
      new Date(data.t * 1000),
      new Date(),
      data.h ?? data.c,
      data.l ?? data.c,
      data.v ?? 0,
      '1d',
    );
  }
}
