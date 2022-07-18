// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

contract MLMSystem {
    mapping(address => address) private referralToReferrer;
    mapping(address => address[]) private directPartners;
    mapping(address => uint256) private userBalance;
    mapping(address => bool) private isSignedUp;
    uint8 constant feePercents = 5;

    struct Referral {
        address addressReferral;
        uint8 level;
    }

    //Checks if the user is logged into the system
    modifier notSignedUp() {
        require(!isSignedUp[msg.sender]);
        _;
    }

    // Returns the balance for a specific address
    function getBalance(address _member) public view returns (uint256 balance) {
        return userBalance[_member];
    }

    //Returns the level of the user, depending on his balance
    function getLevel(address _member) public view returns (uint8) {
        uint currentBalance = getBalance(_member);
        if (currentBalance >= 5e15 && currentBalance < 1e16) {
            return 1;
        } else if (currentBalance >= 1e16 && currentBalance < 2e16) {
            return 2;
        } else if (currentBalance >= 2e16 && currentBalance < 5e16) {
            return 3;
        } else if (currentBalance >= 5e16 && currentBalance < 1e17) {
            return 4;
        } else if (currentBalance >= 1e17 && currentBalance < 2e17) {
            return 5;
        } else if (currentBalance >= 2e17 && currentBalance < 5e17) {
            return 6;
        } else if (currentBalance >= 5e17 && currentBalance < 1e18) {
            return 7;
        } else if (currentBalance >= 1e18 && currentBalance < 2e18) {
            return 8;
        } else if (currentBalance >= 2e18 && currentBalance < 5e18) {
            return 9;
        } else if (currentBalance >= 5e18) {
            return 10;
        }
    }

    // Returns an array of structures containing the level and address of the referrals
    function getReferalsInfo() external view returns (Referral[] memory) {
        require(directPartners[msg.sender].length != 0, "No referrals ");
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

    // Payable function that allows you to invest in this smart contract
    function invest() external payable {
        require(msg.value >= (5 * 10e18) / 10e3, "minimal value = 0.005 Eth");
        userBalance[msg.sender] += (msg.value * (100 - feePercents)) / 100;
    }

    // Function that withdraws all funds from the account, while transferring part of the funds as a commission to referrers
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

    // A function that calculates the total commission (in ether) when withdrawing funds
    function calculateWithdrawalComission(uint256 balance)
        private
        view
        returns (uint256)
    {
        address currentReferrer = referralToReferrer[msg.sender];
        uint256 comissionSum;
        for (uint i = 1; currentReferrer != address(0); i++) {
            uint8 referrerLevel = getLevel(currentReferrer);
            if (referrerLevel > i) {
                comissionSum += (balance / 1000) * findComission(referrerLevel);
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
            if (referrerLevel > depth) {
                comissionSum = (balance * findComission(referrerLevel)) / 1000;
                (bool success, ) = currentReferrer.call{value: (comissionSum)}(
                    "withdraw started"
                );
                require(success, "Transfer failed.");
            }
            currentReferrer = referralToReferrer[currentReferrer];
        }
    }

    //Commission percent calculation function based on referral level
    //@returns percent * 10
    function findComission(uint8 level)
        private
        pure
        returns (uint256 comission)
    {
        require(level > 0 && level <= 10, "Wrong level");
        if (level == 1) {
            return 10;
        } else if (level == 2) {
            return 7;
        } else if (level == 3) {
            return 5;
        } else if (level == 4) {
            return 2;
        } else {
            return 1;
        }
    }
}
