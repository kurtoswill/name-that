"use client";

import { useState } from 'react';
import { useConnect } from 'wagmi';
import { ConnectWallet as OnchainkitConnect } from '@coinbase/onchainkit/wallet';
import { metaMaskConnector, coinbaseConnector } from '@/lib/wagmi';

export default function WalletConnectMenu({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { connectAsync } = useConnect();

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="bg-[#21B65F] hover:bg-[#1ea856] text-[#12242E] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        Connect Wallet
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-[#0f2a2f] border border-[#23363b] rounded-lg shadow-lg z-50">
          <button
            onClick={async () => { setOpen(false); try { await connectAsync({ connector: metaMaskConnector }); } catch (e) { console.error(e); } }}
            className="w-full text-left px-3 py-2 hover:bg-[#132f33]"
          >
            MetaMask
          </button>
          <button
            onClick={async () => { setOpen(false); try { await connectAsync({ connector: coinbaseConnector }); } catch (e) { console.error(e); } }}
            className="w-full text-left px-3 py-2 hover:bg-[#132f33]"
          >
            Coinbase Wallet
          </button>
          <div className="border-t border-[#23363b]" />
          <div className="p-2">
            {/* Render OnchainKit's ConnectWallet UI as an option */}
            <OnchainkitConnect className="w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
