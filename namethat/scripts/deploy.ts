import { viem } from "hardhat";

async function main() {
    const [deployer] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();

    console.log("Deploying contracts with:", deployer.account.address);

    const hash = await deployer.deployContract("PostEscrow", [], {
        value: 1000000000000000000n, // 1 ETH
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log("PostEscrow deployed to:", receipt.contractAddress);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
