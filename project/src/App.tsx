import React, { useState, useEffect } from 'react';
import { WalletContextProvider } from './components/WalletContextProvider';
import { PaymentForm } from './components/PaymentForm';
import { Payment } from './types';
import { TOKENS } from './utils/solana';
import { Coins, CreditCard, LayoutDashboard } from 'lucide-react';

function App() {
  // Mock merchant data
  const merchant = {
    id: 'merchant-1',
    name: 'Solana Shop',
    walletAddress: '5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWc8',
    preferredToken: TOKENS.USDC.mint
  };

  // State for payments
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: 'payment-1',
      amount: 10.5,
      token: TOKENS.USDC.mint,
      status: 'completed',
      timestamp: Date.now() - 86400000, // 1 day ago
      merchantId: merchant.id,
      customerWallet: '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi',
      txSignature: '5SHVFJBFQcNNrAhAYbBbhy9NJ5AciWxSQqgLele8EJpjvuYVJ2v2odSfZTaZJxgLYSS3uUdwDwqQD1rhNAhzU9Vw'
    },
    {
      id: 'payment-2',
      amount: 5.25,
      token: TOKENS.USDC.mint,
      status: 'completed',
      timestamp: Date.now() - 43200000, // 12 hours ago
      merchantId: merchant.id,
      customerWallet: '2qXdVr7JKRm4QfVA11vZ6FHPqvZXP4HxMrmdRP7isnKW',
      txSignature: '3E1Ym2KLRxcALYVBCKPMvXiXBNwzMHia3vLZQKkELwvLCHqu5gVEoHaVo9kj9ZpXmD9YBpKxg4UWjcyYYCPxSvfy'
    },
    {
      id: 'payment-3',
      amount: 2.75,
      token: TOKENS.SOL.mint,
      status: 'completed',
      timestamp: Date.now() - 21600000, // 6 hours ago
      merchantId: merchant.id,
      customerWallet: '9ZNTfG4NyQgxy2SWjSiQoUyBPEvXT2xo7fKc5hPYYJ7b',
      txSignature: '4vJ5SrVB3pS6zm3VoqDpxJ7p1T5KpQ6zrz6x9wQZGmBvMX8vN9n3wPtQYKTcUy2UjnFqVuXhbr2qSxNVnqrWWPPZ'
    }
  ]);

  // Handle new payments
  const handlePaymentComplete = (payment: Payment) => {
    setPayments([...payments, payment]);
  };

  // Toggle between customer and merchant view
  const [view, setView] = useState<'customer' | 'merchant'>('customer');
  
  // Add loading state for a more realistic feel
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <WalletContextProvider>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-blue-600 text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <Coins className="mr-2" size={24} />
              <h1 className="text-xl font-bold">Solana Payment Gateway</h1>
            </div>
            <div>
              <button
                onClick={() => setView(view === 'customer' ? 'merchant' : 'customer')}
                className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-blue-50 transition-colors flex items-center"
              >
                {view === 'customer' ? (
                  <>
                    <LayoutDashboard size={16} className="mr-2" />
                    Switch to Merchant View
                  </>
                ) : (
                  <>
                    <CreditCard size={16} className="mr-2" />
                    Switch to Customer View
                  </>
                )}
              </button>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto py-8 px-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : view === 'customer' ? (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-center">Customer Payment Portal</h2>
              <div className="max-w-md mx-auto">
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h3 className="font-medium text-lg mb-2">Merchant Information</h3>
                  <p><strong>Name:</strong> {merchant.name}</p>
                  <p><strong>Accepts:</strong> Any token (auto-converts to {
                    Object.values(TOKENS).find(t => t.mint === merchant.preferredToken)?.symbol
                  })</p>
                </div>
                
                <PaymentForm
                  merchantAddress={merchant.walletAddress}
                  preferredToken={merchant.preferredToken}
                  onPaymentComplete={handlePaymentComplete}
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-center">Merchant Portal</h2>
              <MerchantDashboard
                merchantName={merchant.name}
                merchantAddress={merchant.walletAddress}
                preferredToken={merchant.preferredToken}
                payments={payments}
              />
            </div>
          )}
        </main>
        
        <footer className="bg-gray-800 text-white p-4 mt-8">
          <div className="container mx-auto text-center">
            <p className="text-sm">
              This is a demo of a Solana payment gateway with Jupiter integration for token swaps.
              All transactions are simulated for demonstration purposes.
            </p>
            <p className="text-xs mt-2 text-gray-400">
              Powered by Solana and Jupiter Protocol | {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    </WalletContextProvider>
  );
}

export default App;