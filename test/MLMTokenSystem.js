const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, waffle } = require("hardhat");
const { deployMockContract } = require("@ethereum-waffle/mock-contract");
const ZENtoken = require("../artifacts/contracts/ZENtoken.sol/ZENtoken.json");

describe("MLMTokenSystem", function () {
  let owner, acc1, acc2, acc3, acc4;
  let mockContract;
  let mlmTokenSystem;

  beforeEach(async function () {
    [owner, acc1, acc2, acc3, acc4] = await ethers.getSigners();
    mockContract = await deployMockContract(owner, ZENtoken.abi);
    MLMTokenSystem = await ethers.getContractFactory("MLMTokenSystem", owner);
    mlmTokenSystem = await MLMTokenSystem.deploy();
    await mlmTokenSystem.deployed();
    await mlmTokenSystem.initialize(mockContract.address);
  });

  it("contract address should be correct", async function () {
    expect(mlmTokenSystem.address).to.be.properAddress;
  });

  it("when the user has registered without a referral, his balance should = 0", async function () {
    await mlmTokenSystem.connect(acc1)["signUp()"]();
    await expect(await mlmTokenSystem.getBalance(owner.address)).to.equal("0");
  });

  it("when the user registers,he shouldn't be already in the system", async function () {
    await mlmTokenSystem.connect(owner)["signUp()"]();
    expect(mlmTokenSystem.connect(owner)["signUp()"]()).to.be.revertedWith(
      "user already registered"
    );
  });

  it("when the user has registered with referrer, referrer address should exist", async function () {
    await expect(
      mlmTokenSystem.connect(owner)["signUp(address)"](acc1.address)
    ).to.be.revertedWith("referrer address doesn't exist");
  });

  it("Information about referrals must consist of two required fields : level and address", async function () {
    const value = 0.006;
    await mockContract.mock.transferFrom
      .withArgs(
        acc1.address,
        mlmTokenSystem.address,
        ethers.utils.parseEther((10 * value).toString())
      )
      .returns(true);
    await mockContract.mock.transferFrom
      .withArgs(
        acc2.address,
        mlmTokenSystem.address,
        ethers.utils.parseEther((2 * value).toString())
      )
      .returns(true);
    await mockContract.mock.transferFrom
      .withArgs(
        acc3.address,
        mlmTokenSystem.address,
        ethers.utils.parseEther((4 * value).toString())
      )
      .returns(true);
    await mockContract.mock.transferFrom
      .withArgs(
        acc4.address,
        mlmTokenSystem.address,
        ethers.utils.parseEther(value.toString())
      )
      .returns(true);
    await mlmTokenSystem.connect(acc1)["signUp()"]();
    await mlmTokenSystem.connect(acc2)["signUp(address)"](acc1.address);
    await mlmTokenSystem.connect(acc3)["signUp(address)"](acc1.address);
    await mlmTokenSystem.connect(acc4)["signUp(address)"](acc1.address);
    await mlmTokenSystem
      .connect(acc1)
      .invest(ethers.utils.parseEther((10 * value).toString()));
    await mlmTokenSystem
      .connect(acc2)
      .invest(ethers.utils.parseEther((2 * value).toString()));
    await mlmTokenSystem
      .connect(acc3)
      .invest(ethers.utils.parseEther((4 * value).toString()));
    await mlmTokenSystem
      .connect(acc4)
      .invest(ethers.utils.parseEther(value.toString()));
    referrals = await mlmTokenSystem.connect(acc1).getReferalsInfo();
    expect(referrals[0].addressReferral).to.equal(acc2.address);
    expect(referrals[0].level).to.equal(
      await mlmTokenSystem.getLevel(acc2.address)
    );

    expect(referrals[1].addressReferral).to.equal(acc3.address);
    expect(referrals[1].level).to.equal(
      await mlmTokenSystem.getLevel(acc3.address)
    );

    expect(referrals[2].addressReferral).to.equal(acc4.address);
    expect(referrals[2].level).to.equal(
      await mlmTokenSystem.getLevel(acc4.address)
    );
  });

  it("withdraw comission should be shared correctly", async function () {
    value = 1;
    await mockContract.mock.transferFrom
      .withArgs(
        acc1.address,
        mlmTokenSystem.address,
        ethers.utils.parseEther((0.012 * value).toString())
      )
      .returns(true);
    await mockContract.mock.transferFrom
      .withArgs(
        acc2.address,
        mlmTokenSystem.address,
        ethers.utils.parseEther((0.006 * value).toString())
      )
      .returns(true);
    await mockContract.mock.transferFrom
      .withArgs(
        acc3.address,
        mlmTokenSystem.address,
        ethers.utils.parseEther((20 * value).toString())
      )
      .returns(true);
    await mlmTokenSystem.connect(acc1)["signUp()"]();
    await mlmTokenSystem.connect(acc2)["signUp(address)"](acc1.address);
    await mlmTokenSystem.connect(acc3)["signUp(address)"](acc2.address);
    await mlmTokenSystem
      .connect(acc1)
      .invest(ethers.utils.parseEther((0.012 * value).toString()));
    await mlmTokenSystem
      .connect(acc2)
      .invest(ethers.utils.parseEther((0.006 * value).toString()));
    await mlmTokenSystem
      .connect(acc3)
      .invest(ethers.utils.parseEther((20 * value).toString()));
    acc1Balance = await mlmTokenSystem.getBalance(acc1.address);
    acc2Balance = await mlmTokenSystem.getBalance(acc2.address);
    acc3Balance = await mlmTokenSystem.getBalance(acc3.address);
    await mockContract.mock.transfer
      .withArgs(
        acc3.address,
        (
          (await mlmTokenSystem.connect(acc3).getBalance(acc3.address)) *
          (1 - 0.017)
        ).toString()
      )
      .returns(true);
    await mlmTokenSystem.connect(acc3).withdraw();
    expect((await mlmTokenSystem.getBalance(acc1.address)).toString()).to.equal(
      (Number(acc1Balance) + Number(acc3Balance * 0.007)).toString()
    );
    expect((await mlmTokenSystem.getBalance(acc2.address)).toString()).to.equal(
      (Number(acc2Balance) + Number(acc3Balance * 0.01)).toString()
    );
  });

  it("when the user has registered with referrer, his balance should = 0", async function () {
    await mlmTokenSystem.connect(owner)["signUp()"]();
    await mlmTokenSystem.connect(acc1)["signUp(address)"](owner.address);
    expect(
      mlmTokenSystem.connect(acc1)["signUp(address)"](owner.address)
    ).to.be.revertedWith("user already registered");
  });

  it("when the user registers with referral link, he shouldn't be already in the system", async function () {
    await mlmTokenSystem.connect(owner)["signUp()"]();
    await mlmTokenSystem.connect(acc1)["signUp(address)"](owner.address);

    expect(await mlmTokenSystem.getBalance(acc1.address)).to.equal("0");
  });

  it("returns correct token balance using getBalance function", async function () {
    tokensAmount = 1;
    await mockContract.mock.transferFrom
      .withArgs(
        owner.address,
        mlmTokenSystem.address,
        ethers.utils.parseEther(tokensAmount.toString())
      )
      .returns(true);

    prevBalance = owner.value;
    await mlmTokenSystem
      .connect(owner)
      .invest(ethers.utils.parseEther(tokensAmount.toString()));
    expect((await mlmTokenSystem.getBalance(owner.address)).toString())
      .to.be.equal(ethers.utils.parseEther((0.95).toString()))
      .toString();
  });

  it("invest should add correct sum to the user's balance", async function () {
    tokensAmount = 1;
    await mockContract.mock.transferFrom
      .withArgs(
        owner.address,
        mlmTokenSystem.address,
        ethers.utils.parseEther(tokensAmount.toString())
      )
      .returns(true);

    prevBalance = owner.value;
    await mlmTokenSystem
      .connect(owner)
      .invest(ethers.utils.parseEther(tokensAmount.toString()));
    expect(
      await mlmTokenSystem.connect(owner).getBalance(owner.address)
    ).to.be.equal(
      (ethers.utils.parseEther(tokensAmount.toString()) * 0.95).toString()
    );
  });

  it("invest sum should be greater than the minimal sum", async function () {
    tokensAmount = 0.001;
    await expect(
      mockContract.mock.transferFrom
        .withArgs(
          owner.address,
          mlmTokenSystem.address,
          ethers.utils.parseEther(tokensAmount.toString())
        )
        .returns(true)
    );

    expect(
      mlmTokenSystem
        .connect(owner)
        .invest(ethers.utils.parseEther(tokensAmount.toString()))
    ).to.be.revertedWith("donate at least 0.005 tokens");
  });

  it("the level must return according to the assignment", async function () {
    const tokenAmount = 0.006;
    await mockContract.mock.transferFrom
      .withArgs(
        owner.address,
        mlmTokenSystem.address,
        ethers.utils.parseEther(tokenAmount.toString())
      )
      .returns(true);

    await mlmTokenSystem.connect(owner)["signUp()"]();
    await mlmTokenSystem.invest(
      ethers.utils.parseEther(tokenAmount.toString())
    );
    expect(
      (await mlmTokenSystem.getLevel(owner.address)).toString()
    ).to.be.equal("1");
  });

  it("user can get referral info only if referrals exist", async function () {
    await mlmTokenSystem.connect(owner)["signUp()"]();
    expect(mlmTokenSystem.connect(owner).getReferalsInfo()).to.be.revertedWith(
      "No referrals"
    );
  });
});
