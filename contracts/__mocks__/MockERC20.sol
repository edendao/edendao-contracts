// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.4;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract MockERC20 is ERC20Upgradeable {
    constructor(address user) {
        __ERC20_init("", "TOKEN");
        _mint(user, 100000e18);
    }
}
