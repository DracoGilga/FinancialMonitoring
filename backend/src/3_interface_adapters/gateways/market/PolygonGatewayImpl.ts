// src/3_interface_adapters/gateways/market/PolygonGatewayImpl.ts
import { IStockMarketQueryGateway } from '../../../2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { StockQuote } from '../../../1_entities/market/StockQuote';

interface PolygonBar {
  c?: number;
  o?: number;
}

interface PolygonTicker {
  min?: PolygonBar;
  day?: PolygonBar;
  prevDay?: PolygonBar;
  updated?: number;
}

interface PolygonResponse {
  ticker?: PolygonTicker;
}

export class PolygonGatewayImpl implements IStockMarketQueryGateway {
  constructor(private readonly apiKey: string) {
    if (!this.apiKey) {
      throw new Error('POLYGON_API_KEY is required');
    }
  }

  public async getQuote(symbol: string): Promise<StockQuote> {
    const response = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${this.apiKey}`,
    );

    if (!response.ok) {
      throw new Error(`Polygon HTTP Error: ${response.statusText}`);
    }

    const data = (await response.json()) as PolygonResponse;

    if (!data || !data.ticker) {
      throw new Error(`Symbol ${symbol} not found on Polygon`);
    }

    const t = data.ticker;
    return new StockQuote(
      symbol.toUpperCase(),
      symbol.toUpperCase(),
      t.min?.c ?? t.day?.c ?? 0,
      t.day?.o ?? 0,
      t.prevDay?.c ?? 0,
      new Date(t.updated ? t.updated / 1000000 : Date.now()),
      new Date(),
    );
  }
}
