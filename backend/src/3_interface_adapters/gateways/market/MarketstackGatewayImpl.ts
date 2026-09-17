// src/3_interface_adapters/gateways/market/MarketstackGatewayImpl.ts
import { IStockMarketQueryGateway } from '../../../2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { StockQuote } from '../../../1_entities/market/StockQuote';
import { SymbolSearchResult } from '../../../1_entities/market/SymbolSearchResult';

interface MarketstackQuote {
  close: number;
  open: number;
  high?: number;
  low?: number;
  volume?: number;
  date: string;
}

interface MarketstackResponse {
  data?: MarketstackQuote[];
}

export class MarketstackGatewayImpl implements IStockMarketQueryGateway {
  constructor(private readonly apiKey: string) {
    if (!this.apiKey) {
      throw new Error('MARKETSTACK_API_KEY is required');
    }
  }

  public searchSymbols(_query: string): Promise<SymbolSearchResult[]> {
    return Promise.resolve([]);
  }

  public async getQuote(symbol: string): Promise<StockQuote> {
    const url = `http://api.marketstack.com/v1/eod/latest?access_key=${this.apiKey}&symbols=${symbol}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Marketstack HTTP Error: ${response.statusText}`);
    }

    const payload = (await response.json()) as MarketstackResponse;
    const data = payload.data?.[0];

    if (!data) {
      throw new Error(`Symbol ${symbol} not found on Marketstack`);
    }

    return new StockQuote(
      symbol.toUpperCase(),
      symbol.toUpperCase(),
      data.close,
      data.open,
      data.close,
      new Date(data.date),
      new Date(),
      data.high ?? data.close,
      data.low ?? data.close,
      data.volume ?? 0,
      '1d',
    );
  }
}
