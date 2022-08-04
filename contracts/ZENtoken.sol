// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ZENtoken is ERC20 {
    address public owner;

    constructor() ERC20("ZENtoken", "ZEN") {
        _mint(msg.sender, 100 * (10**uint256(decimals())));
        owner = msg.sender;
    }

    /**
     * @notice creates a certain number of tokens
     * @param to address of the user who will receive tokens
     * @param amount amount of tokens user will receive
     * @return isSuccessfully true - user got his tokens, false - no
     */
    function mintToken(address to, uint256 amount) external returns (bool isSuccessfully) {
        require(owner == msg.sender, "no execute permissions");
        _mint(to, amount);
        return true;
    }
    /**
     * @notice burns a certain number of tokens
     * @param amount amount of tokens you want to burn
     */
    function burn(uint amount) external {
        _burn(msg.sender, amount);
    }
}
