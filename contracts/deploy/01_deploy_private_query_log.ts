import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const deployPrivateQueryLog: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const loggerAddress = process.env.PROXY_LOGGER_ADDRESS ?? deployer;

  const deployment = await deploy("PrivateQueryLog", {
    from: deployer,
    args: [loggerAddress],
    log: true
  });

  console.log(`PrivateQueryLog deployed at: ${deployment.address}`);
  console.log(`Authorized logger: ${loggerAddress}`);
};

export default deployPrivateQueryLog;
deployPrivateQueryLog.id = "deploy_private_query_log";
deployPrivateQueryLog.tags = ["PrivateQueryLog"];
