export interface IRefreshTokenGenerator {
  generate(): string;
  hash(token: string): string;
}
