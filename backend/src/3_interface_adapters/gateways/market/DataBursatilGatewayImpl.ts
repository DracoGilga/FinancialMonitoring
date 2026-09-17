// src/3_interface_adapters/gateways/market/DataBursatilGatewayImpl.ts
import { IStockMarketQueryGateway } from '../../../2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { StockQuote } from '../../../1_entities/market/StockQuote';
import { SymbolSearchResult } from '../../../1_entities/market/SymbolSearchResult';

interface DataBursatilPrice {
  precio_actual: string;
  precio_apertura: string;
  precio_maximo?: string;
  precio_minimo?: string;
  volumen?: string;
  precio_cierre_anterior: string;
}

type DataBursatilResponse = Record<string, DataBursatilPrice | undefined>;

export class DataBursatilGatewayImpl implements IStockMarketQueryGateway {
  constructor(private readonly apiKey: string) {
    if (!this.apiKey) {
      throw new Error('DATABURSATIL_API_KEY is required');
    }
  }

  public searchSymbols(_query: string): Promise<SymbolSearchResult[]> {
    return Promise.resolve([]);
  }

  public async getQuote(symbol: string): Promise<StockQuote> {
    const cleanSymbol = symbol.replace('.MX', '');
    const url = `https://api.databursatil.com/v1/precios?token=${this.apiKey}&emisora_serie=${cleanSymbol}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`DataBursatil HTTP Error: ${response.statusText}`);
    }

    const data = (await response.json()) as DataBursatilResponse;
    const priceData = data[cleanSymbol];

    if (!priceData) {
      throw new Error(`Symbol ${symbol} not found on DataBursatil`);
    }

    return new StockQuote(
      symbol.toUpperCase(),
      symbol.toUpperCase(),
      parseFloat(priceData.precio_actual),
      parseFloat(priceData.precio_apertura),
      parseFloat(priceData.precio_cierre_anterior),
      new Date(),
      new Date(),
      parseFloat(priceData.precio_maximo ?? priceData.precio_actual),
      parseFloat(priceData.precio_minimo ?? priceData.precio_actual),
      parseFloat(priceData.volumen ?? '0'),
      '1d',
    );
  }
}
