// src/3_interface_adapters/gateways/market/AlphaVantageGatewayImpl.ts
import { IStockMarketQueryGateway } from '../../../2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { StockQuote } from '../../../1_entities/market/StockQuote';
import { SymbolSearchResult } from '../../../1_entities/market/SymbolSearchResult';

interface AlphaVantageQuote {
  '02. open': string;
  '03. high'?: string;
  '04. low'?: string;
  '05. price': string;
  '06. volume'?: string;
  '08. previous close': string;
}

interface AlphaVantageResponse {
  'Global Quote'?: AlphaVantageQuote;
}

export class AlphaVantageGatewayImpl implements IStockMarketQueryGateway {
  constructor(private readonly apiKey: string) {
    if (!this.apiKey) throw new Error('ALPHA_VANTAGE_API_KEY is required');
  }

  public searchSymbols(_query: string): Promise<SymbolSearchResult[]> {
    return Promise.resolve([]);
  }

  public async getQuote(symbol: string): Promise<StockQuote> {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Alpha Vantage HTTP Error: ${response.statusText}`);

    const data = (await response.json()) as AlphaVantageResponse;
    const quote = data['Global Quote'];

    if (!quote || Object.keys(quote).length === 0) {
      throw new Error(
        `Symbol ${symbol} not found on Alpha Vantage or rate limit reached`,
      );
    }

    return new StockQuote(
      symbol.toUpperCase(),
      symbol.toUpperCase(),
      parseFloat(quote['05. price']),
      parseFloat(quote['02. open']),
      parseFloat(quote['08. previous close']),
      new Date(),
      new Date(),
      parseFloat(quote['03. high'] ?? quote['05. price']),
      parseFloat(quote['04. low'] ?? quote['05. price']),
      parseFloat(quote['06. volume'] ?? '0'),
      '1d',
    );
  }
}
