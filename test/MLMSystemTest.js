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
    await mlmSystem.initialize();
  });

  it("contract address should be correct", async function () {
    expect(mlmSystem.address).to.be.properAddress;
  });

  it("when the user has registered without a referral, his balance should = 0", async function () {
    await mlmSystem.connect(acc1)["signUp()"]();
    await expect(await mlmSystem.getBalance(acc1.address)).to.equal("0");
  });

  it("when the user registers,he shouldn't be already in the system", async function () {
    await mlmSystem.connect(acc1)["signUp()"]();
    expect(mlmSystem.connect(acc1)["signUp()"]()).to.be.revertedWith(
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
    expect(await mlmSystem.getBalance(acc2.address)).to.equal("0");
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
    expect(referrals[0].addressReferral).to.equal(acc2.address);
    expect(referrals[0].level).to.equal(await mlmSystem.getLevel(acc2.address));

    expect(referrals[1].addressReferral).to.equal(acc3.address);
    expect(referrals[1].level).to.equal(await mlmSystem.getLevel(acc3.address));

    expect(referrals[2].addressReferral).to.equal(acc4.address);
    expect(referrals[2].level).to.equal(await mlmSystem.getLevel(acc4.address));
  });

  it("must correctly calculate the commission and distribute it among referrals", async function () {
    value = 1;
    await mlmSystem.connect(acc1)["signUp()"]();
    await mlmSystem.connect(acc2)["signUp(address)"](acc1.address);
    await mlmSystem.connect(acc3)["signUp(address)"](acc2.address);
    await mlmSystem.connect(acc1).invest({
      value: ethers.utils.parseEther((0.012 * value).toString()),
    });
    await mlmSystem.connect(acc2).invest({
      value: ethers.utils.parseEther((0.006 * value).toString()),
    });
    await mlmSystem.connect(acc3).invest({
      value: ethers.utils.parseEther((20 * value).toString()),
    });
    acc1Balance = await mlmSystem.getBalance(acc1.address);
    acc2Balance = await mlmSystem.getBalance(acc2.address);
    acc3Balance = await mlmSystem.getBalance(acc3.address);
    await mlmSystem.connect(acc3).withdraw();
    expect((await mlmSystem.getBalance(acc1.address)).toString()).to.equal(
      (Number(acc1Balance) + Number(acc3Balance * 0.007)).toString()
    );
    expect((await mlmSystem.getBalance(acc2.address)).toString()).to.equal(
      (Number(acc2Balance) + Number(acc3Balance * 0.01)).toString()
    );
    expect((await mlmSystem.getBalance(acc3.address)).toString()).to.equal("0");
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
