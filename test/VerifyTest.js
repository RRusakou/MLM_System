const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = require("hardhat");

describe("VerifyTest", async function () {
  let acc1;
  let verifySign;
  const typedData = {
    types: {
      SignatureMessage: [
        { name: "msgName", type: "string" },
        { name: "userWallet", type: "address" },
        { name: "salt", type: "uint256" },
        { name: "amount", type: "uint256" },
      ],
    },
  };

  before(async function () {
    [acc1] = await ethers.getSigners();
    VerifyData = await ethers.getContractFactory("Verify", acc1);
    verifyData = await VerifyData.deploy();
    await verifyData.deployed();
    console.log(verifyData.address);
  });

  it("hashing and verifying structured data must be correst", async function () {
    types = typedData.types;
    message = {
      msgName: "ZEN",
      userWallet: acc1.address,
      salt: 1337,
      amount: 10,
      signature: "",
    };
    domain = {
      name: "ZEN",
      version: "1",
      chainId: 31337,
      verifyingContract: verifyData.address,
    };
    message.signature = await acc1._signTypedData(domain, types, message);
    expect(await verifyData.connect(acc1).proveAddress(message)).to.be.equal(
      true
    );
  });
});
