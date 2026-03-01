// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract PrivateQueryLog is ZamaEthereumConfig {
    error UnauthorizedLogger(address caller);

    mapping(address => euint32) private _queryCount;
    address public immutable logger;

    event QueryCountIncremented(address indexed user);

    constructor(address logger_) {
        require(logger_ != address(0), "logger=0");
        logger = logger_;
    }

    function getEncryptedQueryCount(address user) external view returns (euint32) {
        return _queryCount[user];
    }

    function incrementQueryCount(externalEuint32 encryptedDelta, bytes calldata inputProof) external {
        euint32 delta = FHE.fromExternal(encryptedDelta, inputProof);

        _queryCount[msg.sender] = FHE.add(_queryCount[msg.sender], delta);

        FHE.allowThis(_queryCount[msg.sender]);
        FHE.allow(_queryCount[msg.sender], msg.sender);

        emit QueryCountIncremented(msg.sender);
    }

    function incrementQueryCountFor(address user, uint32 delta) external {
        if (msg.sender != logger) {
            revert UnauthorizedLogger(msg.sender);
        }

        euint32 encryptedDelta = FHE.asEuint32(delta);
        _queryCount[user] = FHE.add(_queryCount[user], encryptedDelta);

        FHE.allowThis(_queryCount[user]);
        FHE.allow(_queryCount[user], user);
        FHE.allow(_queryCount[user], logger);

        emit QueryCountIncremented(user);
    }
}
