export interface Merchant {
  id: string;
  name: string;
  walletAddress: string;
  preferredToken: string;
}

export interface Payment {
  id: string;
  amount: number;
  token: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: number;
  merchantId: string;
  customerWallet?: string;
  txSignature?: string;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI?: string;
}

export interface SwapResult {
  inputAmount: number;
  outputAmount: number;
  inputToken: string;
  outputToken: string;
  txSignature: string;
  fee: number;
}