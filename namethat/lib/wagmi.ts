import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet, metaMask, injected } from 'wagmi/connectors';

// Create shared connector instances once and export them so UI components use the
// identical connector objects that are registered with the wagmi config. Recreating
// connector instances on-demand can lead to state mismatches and walletClient not
// being initialized correctly.
export const coinbaseConnector = coinbaseWallet({
  appName: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'NameThat',
  headlessMode: process.env.NODE_ENV === 'production',
});

export const metaMaskConnector = metaMask();
export const injectedConnector = injected();

export const connectors = [coinbaseConnector, metaMaskConnector, injectedConnector];

export const config = createConfig({
  chains: [base],
  connectors,
  transports: {
    [base.id]: http(),
  },
});