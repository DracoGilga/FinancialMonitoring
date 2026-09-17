// src/3_interface_adapters/gateways/market/MassiveGatewayImpl.ts
import { IStockMarketQueryGateway } from '../../../2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { StockQuote } from '../../../1_entities/market/StockQuote';
import { SymbolSearchResult } from '../../../1_entities/market/SymbolSearchResult';

interface MassiveQuoteResponse {
  price?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  previousClose?: number;
}

export class MassiveGatewayImpl implements IStockMarketQueryGateway {
  constructor(private readonly apiKey: string) {
    if (!this.apiKey) {
      throw new Error('MASSIVE_API_KEY is required');
    }
  }

  public searchSymbols(_query: string): Promise<SymbolSearchResult[]> {
    return Promise.resolve([]);
  }

  public async getQuote(symbol: string): Promise<StockQuote> {
    const url = `https://api.massive.com/v1/stocks/${symbol}/quote`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Massive HTTP Error: ${response.statusText}`);
    }

    const data = (await response.json()) as MassiveQuoteResponse;

    if (!data || !data.price) {
      throw new Error(`Symbol ${symbol} not found on Massive`);
    }

    return new StockQuote(
      symbol.toUpperCase(),
      symbol.toUpperCase(),
      data.price,
      data.open || data.price,
      data.previousClose || data.price,
      new Date(),
      new Date(),
      data.high ?? data.price,
      data.low ?? data.price,
      data.volume ?? 0,
      '1d',
    );
  }
}
