// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../interfaces/IERC7857DataVerifier.sol";

abstract contract BaseVerifier is IERC7857DataVerifier {
    mapping(bytes32 => bool) private _usedProofs;

    function _checkAndMarkProof(bytes32 proofNonce) internal {
        require(!_usedProofs[proofNonce], "Proof already used");
        _usedProofs[proofNonce] = true;
    }
}
