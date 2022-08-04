// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Verify is EIP712 {
    struct Message {
        string msgName;
        address userWallet;
        uint256 salt;
        uint256 amount;
        bytes signature;
    }
    struct EIP712Domain {
        string domainName;
        string version;
        uint256 chainId;
        address verifyingContract;
    }

    constructor() EIP712("ZEN", "1") {}

    /**
    @notice hash TypedData using SignatureMessage structure
    @param _message input message object of SignatureMessage structure
    @return hash hash of encoded message
     */
    function hashData(Message calldata _message)
        private
        view
        returns (bytes32 hash)
    {
        bytes32 hashValue = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    keccak256(
                        "SignatureMessage(string msgName,address userWallet,uint256 salt,uint256 amount)"
                    ),
                    keccak256(bytes(_message.msgName)),
                    _message.userWallet,
                    _message.salt,
                    _message.amount
                )
            )
        );
        return hashValue;
    }

    /**
    @notice recover address using outgoing message and signature and compare it with sender address
    @param _message message with message fields and signature field
    @return isEqual if the addresses equal
     */
    function proveAddress(Message calldata _message)
        public
        view
        returns (bool isEqual)
    {
        bytes32 messageHash = hashData(_message);
        return (ECDSA.recover(messageHash, _message.signature) == msg.sender);
    }
}
