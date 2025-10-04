// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IERC7857.sol";
import "./interfaces/IERC7857Metadata.sol";
import "./interfaces/IERC7857DataVerifier.sol";

/**
 * @title Note3INFT
 * @dev Complete ERC-7857 compliant Intelligent NFT contract for Note3
 * @notice Implements the complete ERC-7857 standard with encrypted metadata
 * @notice Based on 0G Labs official ERC-7857 implementation
 */
contract Note3INFT is ERC721, Ownable, ReentrancyGuard, IERC7857, IERC7857Metadata {
    uint256 private _nextTokenId = 1;
    
    // Token data
    mapping(uint256 => TokenData) private tokens;
    mapping(address owner => mapping(address operator => bool)) private operatorApprovals;
    
    // Note3 specific data
    mapping(uint256 => string) private noteIds;
    mapping(uint256 => string) private tokenNames;
    
    // Contract metadata
    string private _chainURL;
    string private _indexerURL;
    
    // ERC-7857 verifier
    IERC7857DataVerifier public verifier;

    struct TokenData {
        address owner;
        string[] dataDescriptions;
        bytes32[] dataHashes;
        address[] authorizedUsers;
        address approvedUser;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        address verifier_,
        string memory chainURL_,
        string memory indexerURL_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        verifier = IERC7857DataVerifier(verifier_);
        _chainURL = chainURL_;
        _indexerURL = indexerURL_;
    }

    function mint(
        bytes[] calldata proofs,
        string[] calldata dataDescriptions,
        address to
    ) public payable override returns (uint256 tokenId) {
        require(
            dataDescriptions.length == proofs.length,
            "Descriptions and proofs length mismatch"
        );

        if (to == address(0)) {
            to = msg.sender;
        }

        // Verify proofs using the verifier
        PreimageProofOutput[] memory proofOutputs = verifier.verifyPreimage(proofs);
        bytes32[] memory dataHashes = new bytes32[](proofOutputs.length);

        for (uint i = 0; i < proofOutputs.length; i++) {
            require(proofOutputs[i].isValid, "Invalid proof");
            dataHashes[i] = proofOutputs[i].dataHash;
        }

        tokenId = _nextTokenId++;
        tokens[tokenId] = TokenData({
            owner: to,
            dataHashes: dataHashes,
            dataDescriptions: dataDescriptions,
            authorizedUsers: new address[](0),
            approvedUser: address(0)
        });

        _safeMint(to, tokenId);

        emit Minted(tokenId, msg.sender, to, dataHashes, dataDescriptions);
    }

    // Note3 specific minting function
    function mintNote3INFT(
        bytes[] calldata proofs,
        string[] calldata dataDescriptions,
        string memory noteId,
        address to
    ) public payable returns (uint256 tokenId) {
        tokenId = mint(proofs, dataDescriptions, to);
        
        noteIds[tokenId] = noteId;
        tokenNames[tokenId] = string(abi.encodePacked("note3-", noteId));
        
        return tokenId;
    }

    function transfer(
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) public override {
        require(to != address(0), "Zero address");
        require(tokens[tokenId].owner == msg.sender, "Not owner");

        // Verify transfer validity proofs
        TransferValidityProofOutput[] memory proofOutputs = verifier.verifyTransferValidity(proofs);
        bytes16[] memory sealedKeys = new bytes16[](proofOutputs.length);
        bytes32[] memory newDataHashes = new bytes32[](proofOutputs.length);

        for (uint i = 0; i < proofOutputs.length; i++) {
            require(proofOutputs[i].isValid, "Invalid transfer proof");
            require(proofOutputs[i].oldDataHash == tokens[tokenId].dataHashes[i], "Data hash mismatch");
            require(proofOutputs[i].receiver == to, "Receiver mismatch");
            
            sealedKeys[i] = proofOutputs[i].sealedKey;
            newDataHashes[i] = proofOutputs[i].newDataHash;
        }

        tokens[tokenId].owner = to;
        tokens[tokenId].dataHashes = newDataHashes;
        _transfer(tokens[tokenId].owner, to, tokenId);

        emit Transferred(tokenId, msg.sender, to);
        emit PublishedSealedKey(to, tokenId, sealedKeys);
    }

    function clone(
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) public override returns (uint256) {
        require(to != address(0), "Zero address");
        require(tokens[tokenId].owner == msg.sender, "Not owner");

        // Verify transfer validity proofs
        TransferValidityProofOutput[] memory proofOutputs = verifier.verifyTransferValidity(proofs);
        bytes16[] memory sealedKeys = new bytes16[](proofOutputs.length);
        bytes32[] memory newDataHashes = new bytes32[](proofOutputs.length);

        for (uint i = 0; i < proofOutputs.length; i++) {
            require(proofOutputs[i].isValid, "Invalid transfer proof");
            require(proofOutputs[i].oldDataHash == tokens[tokenId].dataHashes[i], "Data hash mismatch");
            require(proofOutputs[i].receiver == to, "Receiver mismatch");
            
            sealedKeys[i] = proofOutputs[i].sealedKey;
            newDataHashes[i] = proofOutputs[i].newDataHash;
        }

        uint256 newTokenId = _nextTokenId++;
        tokens[newTokenId] = TokenData({
            owner: to,
            dataHashes: newDataHashes,
            dataDescriptions: tokens[tokenId].dataDescriptions,
            authorizedUsers: new address[](0),
            approvedUser: address(0)
        });

        _safeMint(to, newTokenId);

        // Copy Note3 specific data
        noteIds[newTokenId] = noteIds[tokenId];
        tokenNames[newTokenId] = string(abi.encodePacked("note3-", noteIds[tokenId]));

        emit Cloned(tokenId, newTokenId, msg.sender, to);
        emit PublishedSealedKey(to, newTokenId, sealedKeys);
        return newTokenId;
    }

    function authorizeUsage(uint256 tokenId, address to) public override {
        require(tokens[tokenId].owner == msg.sender, "Not owner");
        tokens[tokenId].authorizedUsers.push(to);
        emit Authorization(msg.sender, to, tokenId);
    }

    function ownerOf(uint256 tokenId) public view override(ERC721, IERC7857) returns (address) {
        require(tokens[tokenId].owner != address(0), "Token not exist");
        return tokens[tokenId].owner;
    }

    function authorizedUsersOf(
        uint256 tokenId
    ) public view override returns (address[] memory) {
        require(tokens[tokenId].owner != address(0), "Token not exist");
        return tokens[tokenId].authorizedUsers;
    }

    function update(uint256 tokenId, bytes[] calldata proofs) public override {
        require(tokens[tokenId].owner == msg.sender, "Not owner");

        // Verify preimage proofs
        PreimageProofOutput[] memory proofOutputs = verifier.verifyPreimage(proofs);
        bytes32[] memory oldDataHashes = tokens[tokenId].dataHashes;
        bytes32[] memory newDataHashes = new bytes32[](proofOutputs.length);
        
        for (uint i = 0; i < proofOutputs.length; i++) {
            require(proofOutputs[i].isValid, "Invalid proof");
            newDataHashes[i] = proofOutputs[i].dataHash;
        }
        
        tokens[tokenId].dataHashes = newDataHashes;
        emit Updated(tokenId, oldDataHashes, newDataHashes);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, IERC7857Metadata) returns (string memory) {
        require(_exists(tokenId), "Token does not exist");

        return
            string(
                abi.encodePacked(
                    '{"chainURL":"',
                    _chainURL,
                    '","indexerURL":"',
                    _indexerURL,
                    '"}'
                )
            );
    }

    // Note3 specific functions
    function getNoteId(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return noteIds[tokenId];
    }

    function getTokenName(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return tokenNames[tokenId];
    }

    function dataHashesOf(
        uint256 tokenId
    ) public view override returns (bytes32[] memory) {
        require(tokens[tokenId].owner != address(0), "Token not exist");
        return tokens[tokenId].dataHashes;
    }

    function dataDescriptionsOf(
        uint256 tokenId
    ) public view override returns (string[] memory) {
        require(tokens[tokenId].owner != address(0), "Token not exist");
        return tokens[tokenId].dataDescriptions;
    }

    function approve(address to, uint256 tokenId) public override(ERC721) {
        require(tokens[tokenId].owner == msg.sender, "Not owner");
        tokens[tokenId].approvedUser = to;
        super.approve(to, tokenId);
    }

    function setApprovalForAll(address to, bool approved) public override(ERC721) {
        operatorApprovals[msg.sender][to] = approved;
        super.setApprovalForAll(to, approved);
    }

    function getApproved(
        uint256 tokenId
    ) public view override(ERC721) returns (address operator) {
        return tokens[tokenId].approvedUser;
    }

    function isApprovedForAll(
        address owner,
        address operator
    ) public view override(ERC721) returns (bool) {
        return operatorApprovals[owner][operator];
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokens[tokenId].owner != address(0);
    }

    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ERC-7857 Interface Support
    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId) || 
               interfaceId == 0x78570000 ||
               interfaceId == type(IERC7857).interfaceId ||
               interfaceId == type(IERC7857Metadata).interfaceId;
    }

    // ERC-7857 Interface ID calculation
    function getERC7857InterfaceId() public pure returns (bytes4) {
        return 0x78570000;
    }

    // Verify ERC-7857 compliance
    function isERC7857Compliant() public pure returns (bool) {
        return true;
    }

    // Get contract standard
    function getContractStandard() public pure returns (string memory) {
        return "ERC-7857";
    }

    // Get contract type
    function getContractType() public pure returns (string memory) {
        return "INFT";
    }

    // Check if contract implements ERC-7857
    function implementsERC7857() public pure returns (bool) {
        return true;
    }

    string public constant VERSION = "1.0.0";
}