import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("PrivateQueryLog", function () {
  it("stores encrypted query count and lets caller decrypt", async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    const [alice] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("PrivateQueryLog");
    const contract = await factory.deploy(alice.address);
    const contractAddress = await contract.getAddress();

    const encryptedOne = await fhevm
      .createEncryptedInput(contractAddress, alice.address)
      .add32(1)
      .encrypt();

    await (
      await contract
        .connect(alice)
        .incrementQueryCount(encryptedOne.handles[0], encryptedOne.inputProof)
    ).wait();

    const encryptedCount = await contract.getEncryptedQueryCount(alice.address);
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      contractAddress,
      alice
    );

    expect(clearCount).to.eq(1);
  });

  it("allows logger to increment another user count", async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    const [logger, bob] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("PrivateQueryLog");
    const contract = await factory.deploy(logger.address);
    const contractAddress = await contract.getAddress();

    await (await contract.connect(logger).incrementQueryCountFor(bob.address, 1)).wait();

    const encryptedCount = await contract.getEncryptedQueryCount(bob.address);
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      contractAddress,
      bob
    );

    expect(clearCount).to.eq(1);
  });
});
