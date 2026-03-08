import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("PrivateQueryLog", function () {
  it("stores encrypted query count by user bucket without granting logger decrypt rights", async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    const [logger] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("PrivateQueryLog");
    const contract = await factory.deploy(logger.address);
    const contractAddress = await contract.getAddress();
    const userBucketId = ethers.keccak256(ethers.toUtf8Bytes("user-bucket-1"));

    await (await contract.connect(logger).incrementQueryCountForUserBucket(userBucketId, 2)).wait();
    const encryptedCount = await contract.getEncryptedQueryCount(userBucketId);
    expect(encryptedCount).to.not.eq(ethers.ZeroHash);

    let loggerDecryptFailed = false;
    try {
      await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedCount,
        contractAddress,
        logger
      );
    } catch {
      loggerDecryptFailed = true;
    }

    expect(loggerDecryptFailed).to.eq(true);
  });

  it("rejects non-logger writes", async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    const [logger, attacker] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("PrivateQueryLog");
    const contract = await factory.deploy(logger.address);
    const userBucketId = ethers.keccak256(ethers.toUtf8Bytes("user-bucket-2"));

    await expect(
      contract.connect(attacker).incrementQueryCountForUserBucket(userBucketId, 1)
    ).to.be.revertedWithCustomError(contract, "UnauthorizedLogger");
  });
});
