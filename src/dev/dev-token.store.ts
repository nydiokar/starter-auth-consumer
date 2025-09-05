import { Injectable } from '@nestjs/common';

export type DevToken = {
  type: 'verify' | 'reset';
  email: string;
  token: string;
  at: string; // ISO
};

@Injectable()
export class DevTokenStore {
  private tokens: DevToken[] = [];

  add(t: DevToken) {
    this.tokens.push(t);
    // Keep only last 100 tokens to avoid unbounded growth
    if (this.tokens.length > 100) this.tokens.splice(0, this.tokens.length - 100);
  }

  list(email?: string) {
    return this.tokens.filter(t => !email || t.email.toLowerCase() === email.toLowerCase());
  }

  clear(email?: string) {
    if (!email) { this.tokens = []; return; }
    this.tokens = this.tokens.filter(t => t.email.toLowerCase() !== email.toLowerCase());
  }
}

