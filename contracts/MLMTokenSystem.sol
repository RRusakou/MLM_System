// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./ZENtoken.sol";

//1 ZENtoken = 1 eth
contract MLMTokenSystem is Initializable {
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
    address private zenTokenAddress;

    //Checks if the user is logged into the system
    modifier notSignedUp() {
        require(!isSignedUp[msg.sender], "user already registered");
        _;
    }

    function invest(uint256 tokenAmount) external {
        require(tokenAmount >= 5e15, "donate at least 0.005 tokens");

        ZENtoken(zenTokenAddress).transferFrom(
            msg.sender,
            address(this),
            tokenAmount
        );
        userBalance[msg.sender] += (tokenAmount * (100 - FEE_PERCENTS)) / 100;
    }

    function initialize(address _zenTokenAddress) public {
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
        zenTokenAddress = _zenTokenAddress;
    }

    function getBalance(address _member) public view returns (uint256) {
        return userBalance[_member];
    }

    //Returns the level of the user, depending on his balance
    function getLevel(address _member) public view returns (uint8 level) {
        uint currentBalance = getBalance(_member);
        uint8 i = 0;
        while (i < 10 && currentBalance > levels[i]) {
            i++;
        }
        return i;
    }

    // Function that withdraws all funds from the account, while transferring part of the funds as a commission to referrers
    function withdraw() external {
        uint256 withdrawalComission = calculateWithdrawalComission(
            getBalance(msg.sender)
        );
        uint256 amount = getBalance(msg.sender) - withdrawalComission;
        withdrawComissionToReferrers(amount + withdrawalComission);
        ZENtoken(zenTokenAddress).transfer(msg.sender, amount);
    }

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

    // A function that calculates the total commission (in ether) when withdrawing funds
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

    // Function that transfers the commission to the referrer's account when withdrawing funds
    function withdrawComissionToReferrers(uint256 balance) private {
        address currentReferrer = referralToReferrer[msg.sender];
        uint256 comissionSum;
        for (uint8 depth = 1; currentReferrer != address(0); depth++) {
            uint8 referrerLevel = getLevel(currentReferrer);
            if (referrerLevel >= depth) {
                comissionSum = (balance * findComission(depth)) / 1000;
                userBalance[currentReferrer] += comissionSum;
            }
            currentReferrer = referralToReferrer[currentReferrer];
        }
    }

    // Registration function without referral link
    function signUp() public notSignedUp {
        referralToReferrer[msg.sender] = address(0);
        isSignedUp[msg.sender] = true;
    }

    // Referral link registration function
    function signUp(address _referrer) public notSignedUp {
        require(isReferrerExist(_referrer), "referrer address doesn't exist");
        directPartners[_referrer].push(msg.sender);
        referralToReferrer[msg.sender] = _referrer;
        isSignedUp[msg.sender] = true;
    }

    // Function to check the existence of the specified referrer
    function isReferrerExist(address _referrer) private view returns (bool) {
        return isSignedUp[_referrer];
    }

    //Commission percent calculation function based on referral level
    //@returns percent * 10
    function findComission(uint8 level) private view returns (uint256) {
        require(level > 0 && level <= 10, "Wrong level");
        return percents[level - 1];
    }
}
