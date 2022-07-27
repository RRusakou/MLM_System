// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ZENtoken is ERC20 {
    address public owner;

    constructor() ERC20("ZENtoken", "ZEN") {
        _mint(msg.sender, 100 * (10**uint256(decimals())));
        owner = msg.sender;
    }

    function buyToken(address to, uint256 amount) external returns (bool) {
        require(owner == msg.sender, "no execute permissions");
        _mint(to, amount);
        return true;
    }

    function burn(uint amount) external {
        _burn(msg.sender, amount);
    }
}
