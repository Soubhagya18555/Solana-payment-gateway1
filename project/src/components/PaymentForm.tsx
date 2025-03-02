import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { ArrowRight, Wallet, RefreshCw, AlertCircle, Check, Info } from 'lucide-react';
import { TokenInfo, Payment } from '../types';
import { TOKENS, createPaymentTransaction, mockSendTransaction, getTokenBalance } from '../utils/solana';
import { getQuote, executeSwap } from '../utils/jupiter';

interface PaymentFormProps {
  merchantAddress: string;
  preferredToken: string;
  onPaymentComplete: (payment: Payment) => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ 
  merchantAddress, 
  preferredToken,
  onPaymentComplete 
}) => {
  const { publicKey, signTransaction, connected } = useWallet();
  const [amount, setAmount] = useState<number>(1);
  const [selectedToken, setSelectedToken] = useState<string>(TOKENS.SOL.mint);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'quoting' | 'processing' | 'confirming' | 'completed' | 'failed'>('idle');

  const selectedTokenInfo = Object.values(TOKENS).find(t => t.mint === selectedToken) || TOKENS.SOL;
  const preferredTokenInfo = Object.values(TOKENS).find(t => t.mint === preferredToken) || TOKENS.USDC;

  // Fetch token balance when wallet or selected token changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey && connected) {
        setIsLoadingBalance(true);
        try {
          // In a real implementation, this would call getTokenBalance
          // For demo purposes, we'll simulate a balance
          await new Promise(resolve => setTimeout(resolve, 500));
          const mockBalance = selectedToken === TOKENS.SOL.mint 
            ? 5 + Math.random() * 2 
            : 100 + Math.random() * 50;
          setTokenBalance(mockBalance);
        } catch (err) {
          console.error('Error fetching balance:', err);
          setTokenBalance(null);
        } finally {
          setIsLoadingBalance(false);
        }
      } else {
        setTokenBalance(null);
      }
    };

    fetchBalance();
  }, [publicKey, connected, selectedToken]);

  // Fetch quote when amount or tokens change
  useEffect(() => {
    const fetchQuote = async () => {
      if (amount > 0 && selectedToken && preferredToken) {
        if (selectedToken === preferredToken) {
          // No swap needed
          setQuote({
            inputMint: selectedToken,
            outputMint: preferredToken,
            inAmount: amount * (10 ** selectedTokenInfo.decimals),
            outAmount: amount * (10 ** preferredTokenInfo.decimals),
            platformFee: {
              amount: 0,
              feeBps: 0
            },
            priceImpactPct: 0,
          });
          return;
        }
        
        setPaymentStatus('quoting');
        try {
          const quoteResult = await getQuote(
            selectedTokenInfo,
            preferredTokenInfo,
            amount
          );
          setQuote(quoteResult);
          setError(null);
        } catch (err) {
          console.error('Error fetching quote:', err);
          setError('Failed to get exchange rate. Please try again.');
          setQuote(null);
        } finally {
          setPaymentStatus('idle');
        }
      }
    };

    // Debounce the quote fetch to avoid too many API calls
    const timeoutId = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [amount, selectedToken, preferredToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (!quote) {
      setError('Failed to get quote. Please try again.');
      return;
    }

    if (tokenBalance !== null && amount > tokenBalance) {
      setError(`Insufficient balance. You have ${tokenBalance.toFixed(6)} ${selectedTokenInfo.symbol}`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(false);
    setPaymentStatus('processing');

    try {
      // Create a unique payment ID
      const paymentId = 'payment-' + Date.now().toString();
      
      // If the selected token is different from the merchant's preferred token,
      // we need to perform a swap using Jupiter
      if (selectedToken !== preferredToken) {
        // Simulate the swap process
        setPaymentStatus('processing');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // In a real implementation, this would execute the swap through Jupiter
        const swapResult = await executeSwap(
          selectedTokenInfo,
          preferredTokenInfo,
          amount
        );
        
        // Create a payment transaction to send the swapped tokens to the merchant
        const transaction = await createPaymentTransaction(
          swapResult.outputAmount,
          preferredToken,
          publicKey,
          new PublicKey(merchantAddress)
        );
        
        // In a real implementation, this would sign and send the transaction
        setPaymentStatus('confirming');
        const txSignature = await mockSendTransaction(transaction);
        
        // Simulate transaction confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create a payment record
        const payment: Payment = {
          id: paymentId,
          amount: swapResult.outputAmount,
          token: preferredToken,
          status: 'completed',
          timestamp: Date.now(),
          merchantId: merchantAddress,
          customerWallet: publicKey.toString(),
          txSignature
        };
        
        setPaymentStatus('completed');
        setSuccess(true);
        onPaymentComplete(payment);
      } else {
        // No swap needed, direct payment
        const transaction = await createPaymentTransaction(
          amount,
          selectedToken,
          publicKey,
          new PublicKey(merchantAddress)
        );
        
        setPaymentStatus('confirming');
        const txSignature = await mockSendTransaction(transaction);
        
        // Simulate transaction confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const payment: Payment = {
          id: paymentId,
          amount,
          token: selectedToken,
          status: 'completed',
          timestamp: Date.now(),
          merchantId: merchantAddress,
          customerWallet: publicKey.toString(),
          txSignature
        };
        
        setPaymentStatus('completed');
        setSuccess(true);
        onPaymentComplete(payment);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment failed. Please try again.');
      setPaymentStatus('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setPaymentStatus('idle');
    setAmount(1);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Make a Payment</h2>
      
      {!connected ? (
        <div className="mb-6 flex flex-col items-center">
          <p className="mb-4 text-gray-600">Connect your wallet to make a payment</p>
          <WalletMultiButton />
        </div>
      ) : success ? (
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <Check className="text-green-500" size={32} />
            </div>
          </div>
          <h3 className="text-xl font-bold text-green-600 mb-2">Payment Successful!</h3>
          <p className="text-gray-600 mb-6">
            Your payment of {amount} {selectedTokenInfo.symbol} has been processed successfully.
          </p>
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Make Another Payment
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              min="0.000001"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isProcessing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pay with
            </label>
            <div className="relative">
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
                disabled={isProcessing}
              >
                {Object.values(TOKENS).map((token) => (
                  <option key={token.mint} value={token.mint}>
                    {token.symbol} - {token.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <img 
                  src={selectedTokenInfo.logoURI} 
                  alt={selectedTokenInfo.symbol} 
                  className="w-5 h-5" 
                />
              </div>
            </div>
            
            {tokenBalance !== null && (
              <div className="mt-1 text-xs text-gray-500 flex justify-between">
                <span>Balance: {isLoadingBalance ? 'Loading...' : `${tokenBalance.toFixed(6)} ${selectedTokenInfo.symbol}`}</span>
                <button 
                  type="button" 
                  className="text-blue-500 hover:text-blue-700"
                  onClick={() => setAmount(tokenBalance)}
                  disabled={isLoadingBalance || isProcessing}
                >
                  Max
                </button>
              </div>
            )}
          </div>
          
          {quote && (
            <div className={`p-4 rounded-md ${selectedToken !== preferredToken ? 'bg-gray-50' : 'bg-blue-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <img 
                    src={selectedTokenInfo.logoURI} 
                    alt={selectedTokenInfo.symbol} 
                    className="w-6 h-6 mr-2" 
                  />
                  <span>{amount} {selectedTokenInfo.symbol}</span>
                </div>
                <ArrowRight className="text-gray-500" size={20} />
                <div className="flex items-center">
                  <img 
                    src={preferredTokenInfo.logoURI} 
                    alt={preferredTokenInfo.symbol} 
                    className="w-6 h-6 mr-2" 
                  />
                  <span>
                    {(quote.outAmount / (10 ** preferredTokenInfo.decimals)).toFixed(6)} {preferredTokenInfo.symbol}
                  </span>
                </div>
              </div>
              
              {selectedToken !== preferredToken && (
                <div className="text-xs text-gray-500">
                  <div className="flex justify-between mb-1">
                    <span>Fee:</span>
                    <span>{(quote.platformFee?.amount / (10 ** selectedTokenInfo.decimals)).toFixed(6)} {selectedTokenInfo.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price Impact:</span>
                    <span className={quote.priceImpactPct > 1 ? 'text-orange-500' : 'text-gray-600'}>
                      ~{quote.priceImpactPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
              
              {selectedToken === preferredToken && (
                <div className="flex items-center text-xs text-blue-600 mt-1">
                  <Info size={12} className="mr-1" />
                  <span>Direct payment, no swap needed</span>
                </div>
              )}
            </div>
          )}
          
          {paymentStatus === 'quoting' && (
            <div className="flex items-center justify-center py-2 text-sm text-gray-500">
              <RefreshCw className="animate-spin mr-2 h-4 w-4" />
              Getting best price...
            </div>
          )}
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing || !publicKey || !quote || paymentStatus === 'quoting'}
              className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                (isProcessing || !publicKey || !quote || paymentStatus === 'quoting') ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  {paymentStatus === 'processing' ? 'Processing Swap...' : 
                   paymentStatus === 'confirming' ? 'Confirming Transaction...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Wallet className="-ml-1 mr-2 h-5 w-5" />
                  Pay Now
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="flex items-center text-red-500 text-sm mt-2">
              <AlertCircle className="h-4 w-4 mr-1" />
              {error}
            </div>
          )}
          
          <div className="text-xs text-gray-500 mt-4">
            <p>Merchant will receive payment in {preferredTokenInfo.symbol}</p>
            <p>Connected wallet: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</p>
          </div>
        </form>
      )}
    </div>
  );
};