
export interface QuotaData {
  used: number;
  limit: number;
  lastReset: string; // ISO date
}

export interface GeneratedResult {
  id: string;
  originalImage: string; // base64
  prompt: string;
  results: string[]; // array of 4 base64 images
  timestamp: number;
}

export enum AppStep {
  UPLOAD = 1,
  DESCRIBE = 2,
  GENERATE = 3
}
