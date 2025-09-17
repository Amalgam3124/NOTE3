const { ethers } = require("hardhat");
const { updateConfig } = require("./update-config");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting Note3 ERC-7857 INFT deployment to 0G Chain...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "0G");

  if (balance === 0n) {
    console.error("❌ Insufficient balance. Please get testnet tokens from https://faucet.0g.ai/");
    process.exit(1);
  }

  try {
    // Deploy Note3Verifier
    console.log("📡 Deploying Note3Verifier...");
    const Note3Verifier = await ethers.getContractFactory("Note3Verifier");
    const verifier = await Note3Verifier.deploy();
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();
    console.log("✅ Note3Verifier deployed to:", verifierAddress);

    // Deploy Note3INFT
    console.log("🤖 Deploying Note3INFT contract (ERC-7857)...");
    const Note3INFT = await ethers.getContractFactory("Note3INFT");
    const inft = await Note3INFT.deploy(
      "Note3",
      "NOTE3",
      verifierAddress,
      "https://evmrpc-testnet.0g.ai",
      "https://indexer-storage-testnet-turbo.0g.ai"
    );
    await inft.waitForDeployment();
    const inftAddress = await inft.getAddress();
    console.log("✅ Note3INFT contract deployed to:", inftAddress);

    // Test minting
    console.log("🧪 Testing minting...");
    const noteId = "test-note-001";
    const dataDescriptions = ["Note content", "Note metadata"];
    const proofs = [
      ethers.keccak256(ethers.toUtf8Bytes("test-data-1")),
      ethers.keccak256(ethers.toUtf8Bytes("test-data-2"))
    ];

    const mintTx = await inft.mintNote3INFT(
      proofs,
      dataDescriptions,
      noteId,
      deployer.address
    );
    const mintReceipt = await mintTx.wait();
    console.log("✅ Test mint successful");

    // Test token functions
    const tokenId = 1;
    const tokenName = await inft.getTokenName(tokenId);
    const noteIdResult = await inft.getNoteId(tokenId);
    const dataHashes = await inft.dataHashesOf(tokenId);
    const dataDescriptionsResult = await inft.dataDescriptionsOf(tokenId);

    console.log("✅ Token name:", tokenName);
    console.log("✅ Note ID:", noteIdResult);
    console.log("✅ Data hashes count:", dataHashes.length);
    console.log("✅ Data descriptions count:", dataDescriptionsResult.length);

    // Test ERC-7857 compliance
    const verifierResult = await inft.verifier();
    const isERC7857Compliant = await inft.isERC7857Compliant();
    const erc7857InterfaceId = await inft.getERC7857InterfaceId();
    const supportsERC7857 = await inft.supportsInterface(erc7857InterfaceId);
    const contractStandard = await inft.getContractStandard();
    const contractType = await inft.getContractType();
    const version = await inft.VERSION();
    
    console.log("✅ Verifier address:", verifierResult);
    console.log("✅ ERC-7857 Compliance:", isERC7857Compliant);
    console.log("✅ ERC-7857 Interface ID:", erc7857InterfaceId);
    console.log("✅ Supports ERC-7857:", supportsERC7857);
    console.log("✅ Contract Standard:", contractStandard);
    console.log("✅ Contract Type:", contractType);
    console.log("✅ Contract Version:", version);

    // Test interface support
    const supportsIERC7857 = await inft.supportsInterface("0x78570000");
    const supportsIERC721 = await inft.supportsInterface("0x80ac58cd");
    
    console.log("✅ Supports IERC7857:", supportsIERC7857);
    console.log("✅ Supports IERC721:", supportsIERC721);

    // Display results
    console.log("\n🎉 Note3 INFT Deployment Complete!");
    console.log("===================================");
    console.log("Network: 0G Galileo Testnet");
    console.log("Chain ID: 16601");
    console.log("Note3Verifier:", verifierAddress);
    console.log("Note3INFT:", inftAddress);

    console.log("\n📋 Update your .env.local:");
    console.log(`NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=${inftAddress}`);
    console.log(`NEXT_PUBLIC_VERIFIER_CONTRACT_ADDRESS=${verifierAddress}`);

    console.log("\n🔗 View on 0G Chain Scan:");
    console.log(`Verifier: https://chainscan-galileo.0g.ai/address/${verifierAddress}`);
    console.log(`INFT: https://chainscan-galileo.0g.ai/address/${inftAddress}`);

    // Update configuration files
    updateConfig(verifierAddress, inftAddress);

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });