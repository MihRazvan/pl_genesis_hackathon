// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract PrivateQueryLog is ZamaEthereumConfig {
    error UnauthorizedLogger(address caller);
    error InvalidUserBucketId();

    mapping(bytes32 => euint32) private _queryCountByBucketId;
    address public immutable logger;

    event QueryBucketIncremented(bytes32 indexed userBucketId, uint32 delta);

    constructor(address logger_) {
        require(logger_ != address(0), "logger=0");
        logger = logger_;
    }

    function getEncryptedQueryCount(bytes32 userBucketId) external view returns (euint32) {
        return _queryCountByBucketId[userBucketId];
    }

    function incrementQueryCountForUserBucket(bytes32 userBucketId, uint32 delta) external {
        if (msg.sender != logger) {
            revert UnauthorizedLogger(msg.sender);
        }
        if (userBucketId == bytes32(0)) {
            revert InvalidUserBucketId();
        }

        euint32 encryptedDelta = FHE.asEuint32(delta);
        _queryCountByBucketId[userBucketId] = FHE.add(_queryCountByBucketId[userBucketId], encryptedDelta);

        FHE.allowThis(_queryCountByBucketId[userBucketId]);
        FHE.allow(_queryCountByBucketId[userBucketId], logger);

        emit QueryBucketIncremented(userBucketId, delta);
    }
}
