// src/1_entities/market/MonitoredStock.ts
export class MonitoredStock {
  constructor(
    public readonly id: string,
    public readonly symbol: string,
    public readonly companyName: string,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
  ) {}

  public deactivate(): MonitoredStock {
    return new MonitoredStock(
      this.id,
      this.symbol,
      this.companyName,
      false,
      this.createdAt,
    );
  }
}
