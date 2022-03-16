// import { deployments, getNamedAccounts } from "hardhat";
// import { HardhatRuntimeEnvironment } from "hardhat/types";
// import { DeployFunction } from "hardhat-deploy/types";
// import { getAddresses } from "../src/addresses";

// const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
//     if (
//         hre.network.name === "mainnet" ||
//         hre.network.name === "optimism" ||
//         hre.network.name === "polygon"
//     ) {
//         console.log(
//             `!! Deploying GUniRouter to ${hre.network.name}. Hit ctrl + c to abort`
//         );
//         await new Promise((r) => setTimeout(r, 20000));
//     }

//     const { deploy } = deployments;
//     const { deployer } = await getNamedAccounts();
//     const addresses = getAddresses(hre.network.name);

//     await deploy("GUniRouter", {
//         from: deployer,
//         args: [addresses.UniswapV3Factory, addresses.WETH],
//     });
// };

// func.skip = async (hre: HardhatRuntimeEnvironment) => {
//     const shouldSkip =
//         hre.network.name === "mainnet" ||
//         hre.network.name === "polygon" ||
//         hre.network.name === "optimism" ||
//         hre.network.name === "goerli" ||
//         hre.network.name === "mumbai";
//     return shouldSkip ? true : false;
// };

// func.tags = ["GUniRouter"];

// export default func;
