export type CipherRecord = {
  id: string;
  occurredAt: string | null;
  createdAt: string;
  updatedAt: string;
  ivB64: string;
  ciphertextB64: string;
  version: number;
};

export type CreateCipherRecordInput = {
  occurredAt?: string | null;
  ivB64: string;
  ciphertextB64: string;
  version: number;
};

export type ListCipherRecordsResponse = {
  items: CipherRecord[];
  nextCursor: string | null;
};