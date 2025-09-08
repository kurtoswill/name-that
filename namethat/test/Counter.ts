import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("Counter", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("Should emit the Increment event when calling the inc() function", async function () {
    const counter = await viem.deployContract("Counter");

    await viem.assertions.emitWithArgs(
      counter.write.inc(),
      counter,
      "Increment",
      [BigInt(1)],
    );
  });

  it("The sum of the Increment events should match the current value", async function () {
    const counter = await viem.deployContract("Counter");
    const deploymentBlockNumber = await publicClient.getBlockNumber();

    // run a series of increments
    for (let i = BigInt(1); i <= BigInt(10); i = i + BigInt(1)) {
      await counter.write.incBy([i]);
    }

    const events = await publicClient.getContractEvents({
      address: counter.address,
      abi: counter.abi,
      eventName: "Increment",
      fromBlock: deploymentBlockNumber,
      strict: true,
    });

    // check that the aggregated events match the current value
  let total = BigInt(0);
    for (const event of events) {
      total += (event.args as any).by;
    }

    assert.equal(total, await counter.read.x());
  });
});
