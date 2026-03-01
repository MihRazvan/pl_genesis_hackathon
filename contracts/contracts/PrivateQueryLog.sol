// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract PrivateQueryLog is ZamaEthereumConfig {
    mapping(address => euint32) private _queryCount;

    event QueryCountIncremented(address indexed user);

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
}
