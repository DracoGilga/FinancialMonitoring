// src/2_use_cases/auth/shared_ports/IStorageGateway.ts
export interface IStorageGateway {
  saveFile(fileName: string, buffer: Buffer): Promise<string>;
  getFileBuffer(fileName: string): Promise<Buffer>;
}
