import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Load private key (MUST be hex without 0x prefix in .env)
const pk = process.env.WALLET_PRIVATE_KEY;
if (!pk) throw new Error("Missing WALLET_PRIVATE_KEY in .env");

// Ensure it starts with 0x
const account = privateKeyToAccount(
    pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`)
);

export const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(process.env.RPC_URL),
});
