import "@nomicfoundation/hardhat-toolbox-viem";
import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

// Only include accounts in network config when a valid hex private key is provided
const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
let networkAccounts: string[] | undefined = undefined;
if (walletPrivateKey) {
  const isValidPriv = /^0x[0-9a-fA-F]{64}$/.test(walletPrivateKey);
  if (isValidPriv) {
    networkAccounts = [walletPrivateKey];
  } else {
    // Common mistake: people paste their address (0x... length 42) into WALLET_PRIVATE_KEY.
    // Don't crash the config; warn instead and leave accounts undefined.
    // eslint-disable-next-line no-console
    console.warn(
      'WALLET_PRIVATE_KEY is present but not a valid 0x-prefixed 64-hex private key. Network accounts will be omitted.',
    );
  }
}

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    localhost: {
  type: 'http',
      url: "http://127.0.0.1:8545/",
    },
    baseSepolia: {
  type: 'http',
  url: process.env.RPC_URL || "",
  // set accounts only when walletPrivateKey is a valid 0x-prefixed private key
  accounts: networkAccounts,
    },
  },
};

export default config;
