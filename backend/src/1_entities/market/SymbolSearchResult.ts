export class SymbolSearchResult {
  constructor(
    public readonly symbol: string,
    public readonly companyName: string,
    public readonly exchange: string,
    public readonly instrumentType: string,
  ) {}
}
