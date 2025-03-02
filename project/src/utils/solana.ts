import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  Keypair, 
  sendAndConfirmTransaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  createTransferInstruction, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token';
import { TokenInfo } from '../types';
import bs58 from 'bs58';

// Solana connection with more realistic configuration
export const connection = new Connection(
  'https://api.mainnet-beta.solana.com', 
  {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000, // 60 seconds
    disableRetryOnRateLimit: false,
    fetch: fetch
  }
);

// Common token addresses with accurate mainnet addresses
export const TOKENS: Record<string, TokenInfo> = {
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    mint: 'So11111111111111111111111111111111111111112', // Native SOL wrapped address
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana mainnet
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether',
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT on Solana mainnet
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png'
  },
  BONK: {
    symbol: 'BONK',
    name: 'Bonk',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK on Solana mainnet
    decimals: 5,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png'
  },
  JUP: {
    symbol: 'JUP',
    name: 'Jupiter',
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP on Solana mainnet
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN/logo.png'
  }
};

// Create a payment transaction with more realistic handling
export async function createPaymentTransaction(
  amount: number,
  tokenMint: string,
  fromWallet: PublicKey,
  toWallet: PublicKey
): Promise<Transaction> {
  // Create a new transaction with recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const transaction = new Transaction({
    feePayer: fromWallet,
    blockhash,
    lastValidBlockHeight
  });

  // Add a compute budget instruction to potentially increase compute limit
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 200000 // Increase compute units for complex transactions
    })
  );

  // If the token is SOL, create a simple transfer
  if (tokenMint === TOKENS.SOL.mint) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: fromWallet,
        toPubkey: toWallet,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL)
      })
    );
  } else {
    // For SPL tokens, we need to transfer from the associated token account
    const fromTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(tokenMint),
      fromWallet
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(tokenMint),
      toWallet
    );

    // Check if the recipient's token account exists
    try {
      await getAccount(connection, toTokenAccount);
    } catch (error) {
      // If the account doesn't exist, add an instruction to create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          fromWallet, // payer
          toTokenAccount, // associated token account
          toWallet, // owner
          new PublicKey(tokenMint) // mint
        )
      );
    }

    // Add the token transfer instruction
    const tokenInfo = Object.values(TOKENS).find(t => t.mint === tokenMint);
    if (!tokenInfo) {
      throw new Error(`Token info not found for mint: ${tokenMint}`);
    }

    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromWallet,
        Math.floor(amount * (10 ** tokenInfo.decimals)),
        [], // multisigners
        TOKEN_PROGRAM_ID
      )
    );
  }

  return transaction;
}

// This is a mock function since we can't actually sign transactions in this demo
// But it's structured more realistically
export async function mockSendTransaction(transaction: Transaction): Promise<string> {
  try {
    // In a real implementation, this would use the wallet adapter to sign and send
    console.log('Sending transaction:', transaction);
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return a mock transaction signature that looks like a real one
    return bs58.encode(Buffer.from(Array.from({ length: 64 }, () => Math.floor(Math.random() * 256))));
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw new Error('Failed to send transaction');
  }
}

// Get token balance - would be used in a real implementation
export async function getTokenBalance(
  walletAddress: PublicKey,
  tokenMint: string
): Promise<number> {
  try {
    const tokenInfo = Object.values(TOKENS).find(t => t.mint === tokenMint);
    if (!tokenInfo) {
      throw new Error(`Token info not found for mint: ${tokenMint}`);
    }

    // If SOL, get SOL balance
    if (tokenMint === TOKENS.SOL.mint) {
      const balance = await connection.getBalance(walletAddress);
      return balance / LAMPORTS_PER_SOL;
    }

    // For other tokens, get the associated token account
    const tokenAccount = await getAssociatedTokenAddress(
      new PublicKey(tokenMint),
      walletAddress
    );

    try {
      const account = await getAccount(connection, tokenAccount);
      return Number(account.amount) / (10 ** tokenInfo.decimals);
    } catch (error) {
      // If the account doesn't exist, the balance is 0
      return 0;
    }
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw new Error('Failed to get token balance');
  }
}

// Verify transaction - would be used in a real implementation
export async function verifyTransaction(signature: string): Promise<boolean> {
  try {
    // In a real implementation, this would check the transaction status
    // For demo purposes, we'll simulate success
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return false;
  }
}