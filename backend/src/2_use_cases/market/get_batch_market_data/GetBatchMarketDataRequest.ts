export class GetBatchMarketDataRequest {
  public static readonly TOP_COMPANIES = [
    'AAPL',
    'AMZN',
    'MSFT',
    'GOOGL',
    'TSLA',
  ] as const;

  public readonly symbols: readonly string[];

  constructor(symbols?: string | readonly string[]) {
    const parsedSymbols: readonly string[] | undefined =
      typeof symbols === 'string'
        ? symbols.split(',').map((symbol) => symbol.trim())
        : symbols;
    const normalizedSymbols = parsedSymbols
      ?.filter(Boolean)
      .map((symbol) => symbol.toUpperCase());

    this.symbols =
      normalizedSymbols && normalizedSymbols.length > 0
        ? [...new Set(normalizedSymbols)]
        : GetBatchMarketDataRequest.TOP_COMPANIES;
  }
}
