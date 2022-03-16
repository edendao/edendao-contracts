import { expect } from "chai";
import { BigNumber } from "bignumber.js";
import { ethers, network } from "hardhat";
import {
  IERC20,
  IUniswapV3Factory,
  IUniswapV3Pool,
  GUniPool,
  GUniFactory,
  GUniRouter,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

// eslint-disable-next-line
BigNumber.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

// returns the sqrt price as a 64x96
function encodePriceSqrt(reserve1: string, reserve0: string) {
  return new BigNumber(reserve1)
    .div(reserve0)
    .sqrt()
    .multipliedBy(new BigNumber(2).pow(96))
    .integerValue(3)
    .toString();
}

function position(address: string, lowerTick: number, upperTick: number) {
  return ethers.utils.solidityKeccak256(
    ["address", "int24", "int24"],
    [address, lowerTick, upperTick]
  );
}

describe("GUniPool", function () {
  this.timeout(0);

  let uniswapFactory: IUniswapV3Factory;
  let uniswapPool: IUniswapV3Pool;

  let token0: IERC20;
  let token1: IERC20;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;
  let swapRouter: GUniRouter;
  let gUniPool: GUniPool;
  let gUniFactory: GUniFactory;
  let uniswapPoolAddress: string;
  let implementationAddress: string;

  before(async function () {
    [user0, user1] = await ethers.getSigners();
  });

  beforeEach(async function () {
    const uniswapV3Factory = await ethers.getContractFactory(
      "UniswapV3Factory"
    );
    const uniswapDeploy = await uniswapV3Factory.deploy();
    uniswapFactory = (await ethers.getContractAt(
      "IUniswapV3Factory",
      uniswapDeploy.address
    )) as IUniswapV3Factory;

    const gUniRouterFactory = await ethers.getContractFactory("GUniRouter");
    swapRouter = (await gUniRouterFactory.deploy(
      uniswapFactory.address,
      "0xc778417E063141139Fce010982780140Aa0cD5Ab"
    )) as GUniRouter;
    // console.log(await user1.address);
    const mockERC20Factory = await ethers.getContractFactory("MockERC20");
    token0 = (await mockERC20Factory.deploy(await user1.address)) as IERC20;
    token1 = (await mockERC20Factory.deploy(await user1.address)) as IERC20;
    await token0.approve(
      swapRouter.address,
      ethers.utils.parseEther("10000000000000")
    );
    await token1.approve(
      swapRouter.address,
      ethers.utils.parseEther("10000000000000")
    );
    // Sort token0 & token1 so it follows the same order as Uniswap & the GUniPoolFactory
    if (
      ethers.BigNumber.from(token0.address).gt(
        ethers.BigNumber.from(token1.address)
      )
    ) {
      const tmp = token0;
      token0 = token1;
      token1 = tmp;
    }

    await uniswapFactory.createPool(token0.address, token1.address, "3000");
    uniswapPoolAddress = await uniswapFactory.getPool(
      token0.address,
      token1.address,
      "3000"
    );

    uniswapPool = (await ethers.getContractAt(
      "IUniswapV3Pool",
      uniswapPoolAddress
    )) as IUniswapV3Pool;
    await uniswapPool.initialize(encodePriceSqrt("1", "1"));

    await uniswapPool.increaseObservationCardinalityNext("5");

    const gUniPoolFactory = await ethers.getContractFactory("GUniPool");
    const gUniImplementation = await gUniPoolFactory.deploy();

    implementationAddress = gUniImplementation.address;

    const gUniFactoryFactory = await ethers.getContractFactory("GUniFactory");

    gUniFactory = (await gUniFactoryFactory.deploy(
      uniswapFactory.address
    )) as GUniFactory;

    await gUniFactory.initialize(
      implementationAddress,
      await user0.getAddress(),
      await user0.getAddress()
    );

    await gUniFactory.createManagedPool(
      token0.address,
      token1.address,
      3000,
      0,
      -887220,
      887220
    );
    const deployers = await gUniFactory.getDeployers();
    const deployer = deployers[0];
    const gelatoDeployer = await gUniFactory.gelatoDeployer();
    expect(deployer).to.equal(gelatoDeployer);
    const pools = await gUniFactory.getPools(deployer);
    const gelatoPools = await gUniFactory.getGelatoPools();
    expect(pools[0]).to.equal(gelatoPools[0]);
    expect(pools.length).to.equal(gelatoPools.length);

    gUniPool = (await ethers.getContractAt("GUniPool", pools[0])) as GUniPool;
    const gelatoFee = await gUniPool.gelatoFeeBPS();
    expect(gelatoFee.toString()).to.equal("250");
  });

  describe("Before liquidity deposited", function () {
    beforeEach(async function () {
      await token0.approve(
        gUniPool.address,
        ethers.utils.parseEther("1000000")
      );
      await token1.approve(
        gUniPool.address,
        ethers.utils.parseEther("1000000")
      );
      //always user approves swapRouter to send funds on behalf of swapRouter to swapRouter
      await token0
        .connect(user1)
        .approve(swapRouter.address, ethers.utils.parseEther("1000000"));
      await token1
        .connect(user1)
        .approve(swapRouter.address, ethers.utils.parseEther("1000000"));
    });

    describe("swap", function () {
      it("should add liquidity into GUniPool", async function () {
        // console.log(gUniPool);
        //use this function to show to user how much they would mint based on deposits
        const res = await gUniPool.getMintAmounts(ethers.utils.parseEther("1"), ethers.utils.parseEther("1"));

        console.log("amount you can put in for token 0: " + res[0])
        console.log("amount you can put in for token 1: " + res[1])
        console.log("amount you can get out: " + res[2])

        await swapRouter
          .connect(user1)
          .addLiquidity(
            gUniPool.address,
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("1"),
            1,
            1,
            await user1.getAddress()
          );

        // const result = await gUniPool.getMintAmounts(
        //   ethers.utils.parseEther("1"),
        //   ethers.utils.parseEther("1")
        // );
        // await gUniPool.mint(result.mintAmount, await user0.getAddress());

        // expect(await token0.balanceOf(uniswapPool.address)).to.be.gt(0);
        // expect(await token1.balanceOf(uniswapPool.address)).to.be.gt(0);
        // const [liquidity] = await uniswapPool.positions(
        //   position(gUniPool.address, -887220, 887220)
        // );
        // expect(liquidity).to.be.gt(0);
        // const supply = await gUniPool.totalSupply();
        // expect(supply).to.be.gt(0);
        // const result2 = await gUniPool.getMintAmounts(
        //   ethers.utils.parseEther("0.5"),
        //   ethers.utils.parseEther("1")
        // );
        // await gUniPool.mint(result2.mintAmount, await user0.getAddress());
        // const [liquidity2] = await uniswapPool.positions(
        //   position(gUniPool.address, -887220, 887220)
        // );
        // expect(liquidity2).to.be.gt(liquidity);

        // await gUniPool.transfer(
        //   await user1.getAddress(),
        //   ethers.utils.parseEther("1")
        // );
        // await gUniPool
        //   .connect(user1)
        //   .approve(await user0.getAddress(), ethers.utils.parseEther("1"));
        // await gUniPool
        //   .connect(user0)
        //   .transferFrom(
        //     await user1.getAddress(),
        //     await user0.getAddress(),
        //     ethers.utils.parseEther("1")
        //   );

        // const decimals = await gUniPool.decimals();
        // const symbol = await gUniPool.symbol();
        // const name = await gUniPool.name();
        // expect(symbol).to.equal("G-UNI");
        // expect(decimals).to.equal(18);
        // expect(name).to.equal("Gelato Uniswap TOKEN/TOKEN LP");
      });
    });
  });
});
