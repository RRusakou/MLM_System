// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MLMSystem is Initializable {
    struct Referral {
        address addressReferral;
        uint8 level;
    }

    mapping(address => address) private referralToReferrer;
    mapping(address => address[]) private directPartners;
    mapping(address => uint256) private userBalance;
    mapping(address => bool) private isSignedUp;
    uint8 private constant FEE_PERCENTS = 5;
    uint[] private levels;
    uint[] private percents;

    function initialize() public {
        levels = [
            0.005 ether,
            0.01 ether,
            0.02 ether,
            0.05 ether,
            0.1 ether,
            0.2 ether,
            0.5 ether,
            1 ether,
            2 ether,
            5 ether
        ];

        percents = [10, 7, 5, 2, 1, 1, 1, 1, 1, 1];
    }

    /**
     * @notice Modifier checks if the user is logged into the system
     */
    modifier notSignedUp() {
        require(!isSignedUp[msg.sender], "user already registered");
        _;
    }

    /**
     * @notice Function to invest in the system
     */
    function invest() external payable {
        require(msg.value >= (5 * 10e18) / 10e3, "minimal value = 0.005 Eth");
        userBalance[msg.sender] += (msg.value * (100 - FEE_PERCENTS)) / 100;
    }

    /**
     * @notice Function that withdraws all funds from the account, with transferring part of the funds as a commission to referrers
     */
    function withdraw() external {
        uint256 withdrawalComission = calculateWithdrawalComission(
            userBalance[msg.sender]
        );
        uint256 amount = userBalance[msg.sender] - withdrawalComission;
        userBalance[msg.sender] = 0;
        withdrawComissionToReferrers(amount + withdrawalComission);
        (bool success, ) = msg.sender.call{value: amount}("withdraw started");
        require(success, "Transfer failed.");
    }

    /**
     * @notice Function that collects information about referrals
     * @return Referrals info array : address, level
     */
    function getReferalsInfo() external view returns (Referral[] memory) {
        require(directPartners[msg.sender].length != 0, "No referrals");
        uint count = directPartners[msg.sender].length;
        Referral[] memory referralInfo = new Referral[](count);
        for (uint i = 0; i < directPartners[msg.sender].length; i++) {
            referralInfo[i] = Referral({
                addressReferral: directPartners[msg.sender][i],
                level: getLevel(directPartners[msg.sender][i])
            });
        }
        return (referralInfo);
    }

    /**
     * @notice Function for registration without referral link
     */
    function signUp() public notSignedUp {
        referralToReferrer[msg.sender] = address(0);
        isSignedUp[msg.sender] = true;
    }

    /**
     * @notice Function for registration by referral link
     * @param _referrer address of your referrer
     */
    function signUp(address _referrer) public notSignedUp {
        require(isReferrerExist(_referrer), "referrer address doesn't exist");
        directPartners[_referrer].push(msg.sender);
        referralToReferrer[msg.sender] = _referrer;
        isSignedUp[msg.sender] = true;
    }

    /**
     * @notice Function to get the balance of the user
     * @param _member address of the user whose balance you want to receive
     * @return balance user balance
     */
    function getBalance(address _member) public view returns (uint256 balance) {
        return userBalance[_member];
    }

    /**
     * @notice Function that calculates a user's balance based on their balance
     * @param _member address of the user whose level you want to receive
     * @return level user level
     */
    function getLevel(address _member) public view returns (uint8 level) {
        uint currentBalance = getBalance(_member);
        uint8 i = 0;
        while (i < 10 && currentBalance > levels[i]) {
            i++;
        }
        return i;
    }

    /**
     * @notice Function that transfers the commission to the referrer's account when withdrawing funds
     * @param balance user balance
     */
    function withdrawComissionToReferrers(uint256 balance) private {
        address currentReferrer = referralToReferrer[msg.sender];
        uint256 comissionSum;
        for (uint8 depth = 1; currentReferrer != address(0); depth++) {
            uint8 referrerLevel = getLevel(currentReferrer);
            if (referrerLevel >= depth) {
                comissionSum = (balance / 1000) * findComission(depth);
                userBalance[currentReferrer] += comissionSum;
            }
            currentReferrer = referralToReferrer[currentReferrer];
        }
    }

    /**
     * @notice A function that calculates the total commission when withdrawing funds
     * @param balance user balance
     */
    function calculateWithdrawalComission(uint256 balance)
        private
        view
        returns (uint256)
    {
        address currentReferrer = referralToReferrer[msg.sender];
        uint256 comissionSum;
        for (uint8 i = 1; currentReferrer != address(0); i++) {
            uint8 referrerLevel = getLevel(currentReferrer);
            if (referrerLevel >= i) {
                comissionSum += (balance / 1000) * findComission(i);
            }
            currentReferrer = referralToReferrer[currentReferrer];
        }
        return comissionSum;
    }

    /**
     * @notice Function to check the existence of the specified referrer
     * @param _referrer referrer address
     * @return signed return true if referrer exist, false - if not.
     */
    function isReferrerExist(address _referrer) private view returns (bool) {
        return isSignedUp[_referrer];
    }

    /**
     * @notice Commission percent calculation function based on referral level
     * @param level user level
     * @return comission comission * 10 for the current level
     */
    function findComission(uint8 level)
        private
        view
        returns (uint256 comission)
    {
        require(level > 0 && level <= 10, "Wrong level");
        return percents[level - 1];
    }
}
