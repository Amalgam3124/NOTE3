// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {IERC7857} from "./interfaces/IERC7857.sol";
import {IERC7857Metadata} from "./interfaces/IERC7857Metadata.sol";
import {IERC7857DataVerifier, PreimageProofOutput, TransferValidityProofOutput} from "./interfaces/IERC7857DataVerifier.sol";
import {Utils} from "./Utils.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Note3AgentNFT is
    AccessControlEnumerableUpgradeable,
    IERC7857,
    IERC7857Metadata
{
    event Approval(
        address indexed _from,
        address indexed _to,
        uint256 indexed _tokenId
    );
    event ApprovalForAll(
        address indexed _owner,
        address indexed _operator,
        bool _approved
    );

    /// @custom:storage-location erc7201:note3.storage.Note3AgentNFT
    struct Note3AgentNFTStorage {
        // Token data
        mapping(uint256 => TokenData) tokens;
        mapping(address owner => mapping(address operator => bool)) operatorApprovals;
        uint256 nextTokenId;
        // Contract metadata
        string name;
        string symbol;
        string chainURL;
        string indexerURL;
        // Core components
        IERC7857DataVerifier verifier;
        // Note3 specific data
        mapping(uint256 => string) noteIds;
        mapping(uint256 => string) tokenNames;
        mapping(uint256 => IntelligenceConfig) intelligenceConfigs;
        mapping(uint256 => string) summaries;
        mapping(uint256 => string[]) qaPairs;
    }

    struct TokenData {
        address owner;
        string[] dataDescriptions;
        bytes32[] dataHashes;
        address[] authorizedUsers;
        address approvedUser;
    }

    struct IntelligenceConfig {
        string[] capabilities;
        string modelVersion;
        uint256 memoryRequirement;
        uint256 computeUnits;
        string[] dataSources;
        string promptTemplate;
        bool isEncrypted;
    }

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // keccak256(abi.encode(uint(keccak256("note3.storage.Note3AgentNFT")) - 1)) & ~bytes32(uint(0xff))
    bytes32 private constant NOTE3_AGENT_NFT_STORAGE_LOCATION =
        0x4aa80aaafbe0e5fe3fe1aa97f3c1f8c65d61f96ef1aab2b448154f4e07594603;

    function _getNote3Storage()
        private
        pure
        returns (Note3AgentNFTStorage storage $)
    {
        assembly {
            $.slot := NOTE3_AGENT_NFT_STORAGE_LOCATION
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        address verifierAddr,
        string memory chainURL_,
        string memory indexerURL_
    ) public virtual initializer {
        require(verifierAddr != address(0), "Zero address");

        __AccessControlEnumerable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        Note3AgentNFTStorage storage $ = _getNote3Storage();
        $.name = name_;
        $.symbol = symbol_;
        $.chainURL = chainURL_;
        $.indexerURL = indexerURL_;
        $.verifier = IERC7857DataVerifier(verifierAddr);
    }

    // Basic getters
    function name() public view virtual returns (string memory) {
        return _getNote3Storage().name;
    }

    function symbol() public view virtual returns (string memory) {
        return _getNote3Storage().symbol;
    }

    function verifier() public view virtual returns (IERC7857DataVerifier) {
        return _getNote3Storage().verifier;
    }

    // Admin functions
    function updateVerifier(
        address newVerifier
    ) public virtual onlyRole(ADMIN_ROLE) {
        require(newVerifier != address(0), "Zero address");
        _getNote3Storage().verifier = IERC7857DataVerifier(newVerifier);
    }

    function updateURLS(
        string memory newChainURL,
        string memory newIndexerURL
    ) public virtual onlyRole(ADMIN_ROLE) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        $.chainURL = newChainURL;
        $.indexerURL = newIndexerURL;
    }

    function update(uint256 tokenId, bytes[] calldata proofs) public virtual {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        TokenData storage token = $.tokens[tokenId];
        require(token.owner == msg.sender, "Not owner");

        PreimageProofOutput[] memory proofOupt = $.verifier.verifyPreimage(
            proofs
        );
        bytes32[] memory newDataHashes = new bytes32[](proofOupt.length);

        for (uint i = 0; i < proofOupt.length; i++) {
            require(
                proofOupt[i].isValid,
                string(
                    abi.encodePacked(
                        "Invalid preimage proof at index ",
                        i,
                        " with data hash ",
                        proofOupt[i].dataHash
                    )
                )
            );
            newDataHashes[i] = proofOupt[i].dataHash;
        }

        bytes32[] memory oldDataHashes = token.dataHashes;
        token.dataHashes = newDataHashes;

        emit Updated(tokenId, oldDataHashes, newDataHashes);
    }

    function mint(
        bytes[] calldata proofs,
        string[] calldata dataDescriptions,
        address to
    ) public payable virtual returns (uint256 tokenId) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();

        require(
            dataDescriptions.length == proofs.length,
            "Descriptions and proofs length mismatch"
        );

        if (to == address(0)) {
            to = msg.sender;
        }

        PreimageProofOutput[] memory proofOupt = $.verifier.verifyPreimage(
            proofs
        );
        bytes32[] memory dataHashes = new bytes32[](proofOupt.length);

        for (uint i = 0; i < proofOupt.length; i++) {
            require(
                proofOupt[i].isValid,
                string(
                    abi.encodePacked(
                        "Invalid preimage proof at index ",
                        i,
                        " with data hash ",
                        proofOupt[i].dataHash
                    )
                )
            );
            dataHashes[i] = proofOupt[i].dataHash;
        }

        tokenId = $.nextTokenId++;
        $.tokens[tokenId] = TokenData({
            owner: to,
            dataHashes: dataHashes,
            dataDescriptions: dataDescriptions,
            authorizedUsers: new address[](0),
            approvedUser: address(0)
        });

        emit Minted(tokenId, msg.sender, to, dataHashes, dataDescriptions);
    }

    // Note3 specific minting function with intelligence config
    function mintNote3INFT(
        bytes[] calldata proofs,
        string[] calldata dataDescriptions,
        string memory noteId,
        address to,
        IntelligenceConfig memory intelligenceConfig
    ) public payable virtual returns (uint256 tokenId) {
        tokenId = mint(proofs, dataDescriptions, to);
        
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        $.noteIds[tokenId] = noteId;
        $.tokenNames[tokenId] = string(abi.encodePacked("note3-", noteId));
        $.intelligenceConfigs[tokenId] = intelligenceConfig;
        
        return tokenId;
    }

    // Generate summary for a token
    function generateSummary(uint256 tokenId) public virtual {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require(_exists(tokenId), "Token does not exist");
        require($.tokens[tokenId].owner == msg.sender, "Not owner");
        
        // In a real implementation, this would call 0G Compute
        // For now, we'll store a placeholder summary
        $.summaries[tokenId] = string(abi.encodePacked(
            "Summary for note3-",
            $.noteIds[tokenId],
            ": This is an intelligent note that can provide summaries and answer questions about its content."
        ));
    }

    // Add Q&A pair to a token
    function addQAPair(uint256 tokenId, string memory question, string memory answer) public virtual {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require(_exists(tokenId), "Token does not exist");
        require($.tokens[tokenId].owner == msg.sender, "Not owner");
        
        $.qaPairs[tokenId].push(question);
        $.qaPairs[tokenId].push(answer);
    }

    // Get summary for a token
    function getSummary(uint256 tokenId) public view virtual returns (string memory) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require(_exists(tokenId), "Token does not exist");
        return $.summaries[tokenId];
    }

    // Get Q&A pairs for a token
    function getQAPairs(uint256 tokenId) public view virtual returns (string[] memory) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require(_exists(tokenId), "Token does not exist");
        return $.qaPairs[tokenId];
    }

    // Get intelligence config for a token
    function getIntelligenceConfig(uint256 tokenId) public view virtual returns (IntelligenceConfig memory) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require(_exists(tokenId), "Token does not exist");
        return $.intelligenceConfigs[tokenId];
    }

    function transfer(
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) public virtual {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require(to != address(0), "Zero address");
        require($.tokens[tokenId].owner == msg.sender, "Not owner");

        TransferValidityProofOutput[] memory proofOupt = $
            .verifier
            .verifyTransferValidity(proofs);
        bytes16[] memory sealedKeys = new bytes16[](proofOupt.length);
        bytes32[] memory newDataHashes = new bytes32[](proofOupt.length);

        for (uint i = 0; i < proofOupt.length; i++) {
            require(
                proofOupt[i].isValid &&
                    proofOupt[i].oldDataHash ==
                    $.tokens[tokenId].dataHashes[i] &&
                    proofOupt[i].receiver == to,
                string(
                    abi.encodePacked(
                        "Invalid transfer validity proof at index ",
                        i
                    )
                )
            );
            sealedKeys[i] = proofOupt[i].sealedKey;
            newDataHashes[i] = proofOupt[i].newDataHash;
        }

        $.tokens[tokenId].owner = to;
        $.tokens[tokenId].dataHashes = newDataHashes;

        emit Transferred(tokenId, msg.sender, to);
        emit PublishedSealedKey(to, tokenId, sealedKeys);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) public virtual {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require(to != address(0), "Zero address");
        require($.tokens[tokenId].owner == from, "Not owner");
        require(
            $.tokens[tokenId].approvedUser == msg.sender ||
                $.tokens[tokenId].owner == msg.sender ||
                $.operatorApprovals[from][msg.sender],
            "Not approved"
        );

        TransferValidityProofOutput[] memory proofOupt = $
            .verifier
            .verifyTransferValidity(proofs);
        bytes16[] memory sealedKeys = new bytes16[](proofOupt.length);
        bytes32[] memory newDataHashes = new bytes32[](proofOupt.length);

        for (uint i = 0; i < proofOupt.length; i++) {
            require(proofOupt[i].isValid, "Invalid transfer validity proof");
            require(
                proofOupt[i].newDataHash == $.tokens[tokenId].dataHashes[i],
                string(
                    abi.encodePacked(
                        "New data hash mismatch, hash in proof: ",
                        Strings.toHexString(
                            uint256(proofOupt[i].newDataHash),
                            32
                        ),
                        ", but hash in token: ",
                        Strings.toHexString(
                            uint256($.tokens[tokenId].dataHashes[i]),
                            32
                        )
                    )
                )
            );
            require(
                proofOupt[i].receiver == to,
                string(
                    abi.encodePacked(
                        "Receiver mismatch, receiver in proof: ",
                        Strings.toHexString(
                            uint256(uint160(proofOupt[i].receiver)),
                            20
                        ),
                        ", but transfer to: ",
                        Strings.toHexString(uint256(uint160(to)), 20)
                    )
                )
            );
            sealedKeys[i] = proofOupt[i].sealedKey;
            newDataHashes[i] = proofOupt[i].newDataHash;
        }

        $.tokens[tokenId].owner = to;
        $.tokens[tokenId].dataHashes = newDataHashes;

        emit Transferred(tokenId, msg.sender, to);
        emit PublishedSealedKey(to, tokenId, sealedKeys);
    }

    function clone(
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) public virtual returns (uint256) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require(to != address(0), "Zero address");
        require($.tokens[tokenId].owner == msg.sender, "Not owner");

        TransferValidityProofOutput[] memory proofOupt = $
            .verifier
            .verifyTransferValidity(proofs);
        bytes32[] memory newDataHashes = new bytes32[](proofOupt.length);
        bytes16[] memory sealedKeys = new bytes16[](proofOupt.length);

        for (uint i = 0; i < proofOupt.length; i++) {
            require(
                proofOupt[i].isValid &&
                    proofOupt[i].oldDataHash ==
                    $.tokens[tokenId].dataHashes[i] &&
                    proofOupt[i].receiver == to,
                string(
                    abi.encodePacked(
                        "Invalid transfer validity proof at index ",
                        i
                    )
                )
            );
            sealedKeys[i] = proofOupt[i].sealedKey;
            newDataHashes[i] = proofOupt[i].newDataHash;
        }

        uint256 newTokenId = $.nextTokenId++;
        $.tokens[newTokenId] = TokenData({
            owner: to,
            dataHashes: newDataHashes,
            dataDescriptions: $.tokens[tokenId].dataDescriptions,
            authorizedUsers: new address[](0),
            approvedUser: address(0)
        });

        // Copy Note3 specific data
        $.noteIds[newTokenId] = $.noteIds[tokenId];
        $.tokenNames[newTokenId] = string(abi.encodePacked("note3-", $.noteIds[tokenId]));
        $.intelligenceConfigs[newTokenId] = $.intelligenceConfigs[tokenId];
        $.summaries[newTokenId] = $.summaries[tokenId];
        $.qaPairs[newTokenId] = $.qaPairs[tokenId];

        emit Cloned(tokenId, newTokenId, msg.sender, to);
        emit PublishedSealedKey(to, newTokenId, sealedKeys);
        return newTokenId;
    }

    function cloneFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) public virtual returns (uint256) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require(to != address(0), "Zero address");
        require($.tokens[tokenId].owner == from, "Not owner");
        require(
            $.tokens[tokenId].approvedUser == msg.sender ||
                $.tokens[tokenId].owner == msg.sender ||
                $.operatorApprovals[from][msg.sender],
            "Not approved"
        );

        TransferValidityProofOutput[] memory proofOupt = $
            .verifier
            .verifyTransferValidity(proofs);
        bytes32[] memory newDataHashes = new bytes32[](proofOupt.length);
        bytes16[] memory sealedKeys = new bytes16[](proofOupt.length);

        for (uint i = 0; i < proofOupt.length; i++) {
            require(
                proofOupt[i].isValid &&
                    proofOupt[i].oldDataHash ==
                    $.tokens[tokenId].dataHashes[i] &&
                    proofOupt[i].receiver == to,
                string(
                    abi.encodePacked(
                        "Invalid transfer validity proof at index ",
                        i
                    )
                )
            );
            sealedKeys[i] = proofOupt[i].sealedKey;
            newDataHashes[i] = proofOupt[i].newDataHash;
        }

        uint256 newTokenId = $.nextTokenId++;
        $.tokens[newTokenId] = TokenData({
            owner: to,
            dataHashes: newDataHashes,
            dataDescriptions: $.tokens[tokenId].dataDescriptions,
            authorizedUsers: new address[](0),
            approvedUser: address(0)
        });

        // Copy Note3 specific data
        $.noteIds[newTokenId] = $.noteIds[tokenId];
        $.tokenNames[newTokenId] = string(abi.encodePacked("note3-", $.noteIds[tokenId]));
        $.intelligenceConfigs[newTokenId] = $.intelligenceConfigs[tokenId];
        $.summaries[newTokenId] = $.summaries[tokenId];
        $.qaPairs[newTokenId] = $.qaPairs[tokenId];

        emit Cloned(tokenId, newTokenId, msg.sender, to);
        emit PublishedSealedKey(to, newTokenId, sealedKeys);
        return newTokenId;
    }

    function authorizeUsage(uint256 tokenId, address to) public virtual {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require($.tokens[tokenId].owner == msg.sender, "Not owner");
        $.tokens[tokenId].authorizedUsers.push(to);
        emit Authorization(msg.sender, to, tokenId);
    }

    function ownerOf(uint256 tokenId) public view virtual returns (address) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        TokenData storage token = $.tokens[tokenId];
        require(token.owner != address(0), "Token not exist");
        return token.owner;
    }

    function authorizedUsersOf(
        uint256 tokenId
    ) public view virtual returns (address[] memory) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        TokenData storage token = $.tokens[tokenId];
        require(token.owner != address(0), "Token not exist");
        return token.authorizedUsers;
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual returns (string memory) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require(_exists(tokenId), "Token does not exist");

        // Get token data
        string memory tokenName = $.tokenNames[tokenId];
        string memory noteId = $.noteIds[tokenId];
        IntelligenceConfig memory config = $.intelligenceConfigs[tokenId];
        string memory summary = $.summaries[tokenId];
        string[] memory qaPairs = $.qaPairs[tokenId];

        // Build capabilities string
        string memory capabilitiesStr = "[";
        for (uint i = 0; i < config.capabilities.length; i++) {
            capabilitiesStr = string(abi.encodePacked(capabilitiesStr, '"', config.capabilities[i], '"'));
            if (i < config.capabilities.length - 1) {
                capabilitiesStr = string(abi.encodePacked(capabilitiesStr, ","));
            }
        }
        capabilitiesStr = string(abi.encodePacked(capabilitiesStr, "]"));

        // Build Q&A pairs string
        string memory qaStr = "[";
        for (uint i = 0; i < qaPairs.length; i += 2) {
            if (i + 1 < qaPairs.length) {
                qaStr = string(abi.encodePacked(
                    qaStr,
                    '{"question":"', qaPairs[i], '","answer":"', qaPairs[i + 1], '"}'
                ));
                if (i + 2 < qaPairs.length) {
                    qaStr = string(abi.encodePacked(qaStr, ","));
                }
            }
        }
        qaStr = string(abi.encodePacked(qaStr, "]"));

        return
            string(
                abi.encodePacked(
                    '{"name":"',
                    tokenName,
                    '","description":"Intelligent Note3 NFT with AI capabilities","image":"ipfs://QmYourImageHash","external_url":"',
                    $.chainURL,
                    '","attributes":[{"trait_type":"Note ID","value":"',
                    noteId,
                    '"},{"trait_type":"Capabilities","value":"',
                    capabilitiesStr,
                    '"},{"trait_type":"Model Version","value":"',
                    config.modelVersion,
                    '"},{"trait_type":"Memory Requirement","value":',
                    Utils.toString(config.memoryRequirement),
                    '},{"trait_type":"Compute Units","value":',
                    Utils.toString(config.computeUnits),
                    '},{"trait_type":"Data Sources","value":',
                    Utils.toString(config.dataSources.length),
                    '}],"intelligence":{"capabilities":',
                    capabilitiesStr,
                    ',"model_version":"',
                    config.modelVersion,
                    '","compute_requirements":{"memory":',
                    Utils.toString(config.memoryRequirement),
                    ',"compute_units":',
                    Utils.toString(config.computeUnits),
                    '},"data_sources":[',
                    _buildDataSourcesString(config.dataSources),
                    '],"prompt_template":"',
                    config.promptTemplate,
                    '","is_encrypted":',
                    config.isEncrypted ? "true" : "false",
                    '},"summary":"',
                    summary,
                    '","qa_pairs":',
                    qaStr,
                    ',"created_at":',
                    Utils.toString(block.timestamp),
                    ',"author":"',
                    Strings.toHexString(uint160($.tokens[tokenId].owner), 20),
                    '","note_id":"',
                    noteId,
                    '","note_cid":"ipfs://QmYourNoteCID"}'
                )
            );
    }

    function _buildDataSourcesString(string[] memory dataSources) internal pure returns (string memory) {
        if (dataSources.length == 0) return "";
        
        string memory result = "";
        for (uint i = 0; i < dataSources.length; i++) {
            result = string(abi.encodePacked(result, '"', dataSources[i], '"'));
            if (i < dataSources.length - 1) {
                result = string(abi.encodePacked(result, ","));
            }
        }
        return result;
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _getNote3Storage().tokens[tokenId].owner != address(0);
    }

    function dataHashesOf(
        uint256 tokenId
    ) public view virtual returns (bytes32[] memory) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        TokenData storage token = $.tokens[tokenId];
        require(token.owner != address(0), "Token not exist");
        return token.dataHashes;
    }

    function dataDescriptionsOf(
        uint256 tokenId
    ) public view virtual returns (string[] memory) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        TokenData storage token = $.tokens[tokenId];
        require(token.owner != address(0), "Token not exist");
        return token.dataDescriptions;
    }

    // Note3 specific functions
    function getNoteId(uint256 tokenId) public view returns (string memory) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require(_exists(tokenId), "Token does not exist");
        return $.noteIds[tokenId];
    }

    function getTokenName(uint256 tokenId) public view returns (string memory) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require(_exists(tokenId), "Token does not exist");
        return $.tokenNames[tokenId];
    }

    function approve(address to, uint256 tokenId) public virtual {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        require($.tokens[tokenId].owner == msg.sender, "Not owner");
        $.tokens[tokenId].approvedUser = to;
        emit Approval(msg.sender, to, tokenId);
    }

    function setApprovalForAll(address to, bool approved) public virtual {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        $.operatorApprovals[msg.sender][to] = approved;
        emit ApprovalForAll(msg.sender, to, approved);
    }

    function getApproved(
        uint256 tokenId
    ) public view virtual returns (address operator) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        return $.tokens[tokenId].approvedUser;
    }

    function isApprovedForAll(
        address owner,
        address operator
    ) public view virtual returns (bool) {
        Note3AgentNFTStorage storage $ = _getNote3Storage();
        return $.operatorApprovals[owner][operator];
    }

    string public constant VERSION = "1.0.0";
}