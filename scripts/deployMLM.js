const { ethers, upgrades } = require("hardhat");
require("dotenv").config();
async function main() {
  MLMSystem = await ethers.getContractFactory(
    "MLMSystem",
    process.env.DEPLOY_ACC_RINKEBY
  );
  console.log("Deploying MLM...");
  const mlmSystem = await upgrades.deployProxy(MLMSystem, [], {
    initializer: "initialize",
  });
  await mlmSystem.deployed();
  console.log("Contract deployed to : ", mlmSystem.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
