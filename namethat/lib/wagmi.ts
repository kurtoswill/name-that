import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, metaMask, injected } from 'wagmi/connectors';

// Reuse connectors across app
export const coinbaseConnector = coinbaseWallet({
  appName: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'NameThat',
  headlessMode: process.env.NODE_ENV === 'production',
});

export const metaMaskConnector = metaMask();
export const injectedConnector = injected();

export const connectors = [coinbaseConnector, metaMaskConnector, injectedConnector];

// Config: support both Base mainnet & Base Sepolia
export const config = createConfig({
  chains: [base, baseSepolia],
  connectors,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http("https://sepolia.base.org"), // 👈 official Sepolia RPC
  },
});
