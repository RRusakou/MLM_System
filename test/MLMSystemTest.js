const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, waffle } = require("hardhat");

describe("MLMSystem", function () {
  let mlmSystem;
  let acc1;
  let acc2;
  let acc3;
  let acc4;
  beforeEach(async function () {
    [acc1, acc2, acc3, acc4] = await ethers.getSigners();
    MLMSystem = await ethers.getContractFactory("MLMSystem", acc1);
    mlmSystem = await MLMSystem.deploy();
    await mlmSystem.deployed();
    console.log(mlmSystem.address);
  });

  it("contract should be correctly deployed", async function () {
    expect(mlmSystem.address).to.be.properAddress;
  });

  it("when the user has registered without a referral, his balance should = 0", async function () {
    await mlmSystem.connect(acc1)["signUp()"]();
    balance = await mlmSystem.getBalance(acc1.address);
    expect(balance == 0);
  });

  it("when the user registers,he shouldn't be already in the system", async function () {
    await mlmSystem.connect(acc1)["signUp()"]();
    await expect(mlmSystem.connect(acc1)["signUp()"]()).to.be.revertedWith(
      "user already registered"
    );
  });

  it("when the user has registered with referrer, referrer address should exist", async function () {
    await expect(
      mlmSystem.connect(acc1)["signUp(address)"](acc1.address)
    ).to.be.revertedWith("referrer address doesn't exist");
  });

  it("when the user has registered with referrer, his balance should = 0", async function () {
    await mlmSystem.connect(acc1)["signUp()"]();
    await mlmSystem.connect(acc2)["signUp(address)"](acc1.address);
    balance = await mlmSystem.getBalance(acc2.address);
    expect(balance == 0);
  });

  it("must add the correct number of currency to the user's account", async function () {
    const value = 0.006;
    const comission = 0.05;
    await mlmSystem.connect(acc1)["signUp()"]();
    const tx = await mlmSystem.invest({
      value: ethers.utils.parseEther(value.toString()),
    });
    await tx.wait();
    expect((await mlmSystem.getBalance(acc1.address)).toString()).to.equal(
      ((1 - comission) * ethers.utils.parseEther(value.toString())).toString()
    );
  });

  it("the level must return according to the assignment", async function () {
    await mlmSystem.connect(acc1)["signUp()"]();
    const value = 0.006;
    const tx = await mlmSystem.invest({
      value: ethers.utils.parseEther(value.toString()),
    });
    await tx.wait();
    expect((await mlmSystem.getLevel(acc1.address)).toString()).to.equal("1");
  });

  it("Information about referrals must consist of two required fields : level and address", async function () {
    await mlmSystem.connect(acc1)["signUp()"]();
    const value = 0.006;
    await mlmSystem.connect(acc2)["signUp(address)"](acc1.address);
    await mlmSystem.connect(acc3)["signUp(address)"](acc1.address);
    await mlmSystem.connect(acc4)["signUp(address)"](acc1.address);
    await mlmSystem.connect(acc1).invest({
      value: ethers.utils.parseEther((10 * value).toString()),
    });
    await mlmSystem.connect(acc2).invest({
      value: ethers.utils.parseEther((2 * value).toString()),
    });
    await mlmSystem.connect(acc3).invest({
      value: ethers.utils.parseEther((4 * value).toString()),
    });
    await mlmSystem.connect(acc4).invest({
      value: ethers.utils.parseEther(value.toString()),
    });
    referrals = await mlmSystem.connect(acc1).getReferalsInfo();
    expect(referrals[0].addressReferral == acc2.address);
    expect(referrals[0].level == mlmSystem.getLevel(acc2.address));

    expect(referrals[1].addressReferral == acc3.address);
    expect(referrals[1].level == mlmSystem.getLevel(acc3.address));

    expect(referrals[2].addressReferral == acc4.address);
    expect(referrals[2].level == mlmSystem.getLevel(acc4.address));
  });

  it("must correctly calculate the commission and distribute it among referrals", async function () {
    await mlmSystem.connect(acc1)["signUp()"]();
    const value = 0.006;
    await mlmSystem.connect(acc2)["signUp(address)"](acc1.address);
    await mlmSystem.connect(acc3)["signUp(address)"](acc1.address);
    await mlmSystem.connect(acc4)["signUp(address)"](acc1.address);
    await mlmSystem.connect(acc1).invest({
      value: ethers.utils.parseEther((10 * value).toString()),
    });
    await mlmSystem.connect(acc2).invest({
      value: ethers.utils.parseEther((4 * value).toString()),
    });
    await mlmSystem.connect(acc3).invest({
      value: ethers.utils.parseEther((2 * value).toString()),
    });
    await mlmSystem.connect(acc4).invest({
      value: ethers.utils.parseEther(value.toString()),
    });

    oldBalanceReferrerThirdLevel = await mlmSystem
      .connect(acc1)
      .getBalance(acc1.address);
    oldBalanceReferrerSecondLevel = await mlmSystem
      .connect(acc2)
      .getBalance(acc2.address);
    oldBalanceReferrerFirstLevel = await mlmSystem
      .connect(acc3)
      .getBalance(acc3.address);
    balanceOfReferral = mlmSystem.connect(acc4).getBalance();
    mlmSystem.connect(acc4).withdraw();
    expect(
      (oldBalanceReferrerThirdLevel + (balanceOfReferral * 1) / 10e3).toString()
    ) == (await mlmSystem.connect(acc1).getBalance(acc1.address)).toString();
    expect(
      (
        oldBalanceReferrerSecondLevel +
        (balanceOfReferral * 1) / 10e3
      ).toString()
    ) == (await mlmSystem.connect(acc2).getBalance(acc2.address)).toString();
    expect(
      (oldBalanceReferrerFirstLevel + (balanceOfReferral * 1) / 10e3).toString()
    ) == (await mlmSystem.connect(acc3).getBalance(acc3.address)).toString();
  });

  it("the balance of the participant who withdraws funds must be zeroed", async function () {
    await mlmSystem.connect(acc1)["signUp()"]();
    await mlmSystem.connect(acc1).invest({
      value: ethers.utils.parseEther((1000).toString()),
    });
    await mlmSystem.connect(acc1).withdraw();
    expect(await mlmSystem.getBalance(acc1.address)).to.equal(0);
  });

  it("Should fail if sender doesn't have enough tokens", async function () {
    await expect(
      mlmSystem.connect(acc1).invest({ value: 1 })
    ).to.be.revertedWith("minimal value = 0.005 Eth");
  });
});