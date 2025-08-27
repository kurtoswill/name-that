import "@nomicfoundation/hardhat-toolbox-viem";
import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545/",
    },
    baseSepolia: {
      url: process.env.RPC_URL || "",
      accounts: [process.env.WALLET_PRIVATE_KEY || ""],
    },
  },
};

export default config;
