const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🚀 Starting Note3 Agent NFT deployment to 0G Chain...");

    // Check if private key is set
    if (!process.env.PRIVATE_KEY) {
        console.error("❌ Please set PRIVATE_KEY in your .env file");
        process.exit(1);
    }

    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);

    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "0G");

    if (balance === 0n) {
        console.error("❌ Insufficient balance for deployment");
        process.exit(1);
    }

    try {
        // 1. Deploy Note3Verifier
        console.log("📡 Deploying Note3Verifier...");
        const Note3Verifier = await ethers.getContractFactory("Note3Verifier");
        const note3Verifier = await Note3Verifier.deploy(
            "0x0000000000000000000000000000000000000000", // attestationContract
            0 // VerifierType.TEE
        );
        await note3Verifier.waitForDeployment();
        const verifierAddress = await note3Verifier.getAddress();
        console.log("✅ Note3Verifier deployed to:", verifierAddress);

        // 2. Deploy Note3AgentNFT implementation
        console.log("🤖 Deploying Note3AgentNFT implementation...");
        const Note3AgentNFT = await ethers.getContractFactory("Note3AgentNFT");
        const note3AgentNFTImpl = await Note3AgentNFT.deploy();
        await note3AgentNFTImpl.waitForDeployment();
        const implAddress = await note3AgentNFTImpl.getAddress();
        console.log("✅ Note3AgentNFT implementation deployed to:", implAddress);

        // 3. Prepare initialization parameters
        const nftName = "Note3";
        const nftSymbol = "NOTE3";
        const chainURL = "https://evmrpc.0g.ai";
        const indexerURL = "https://indexer-storage-turbo.0g.ai";

        // 4. Encode initialization data
        const initData = Note3AgentNFT.interface.encodeFunctionData("initialize", [
            nftName,
            nftSymbol,
            verifierAddress,
            chainURL,
            indexerURL
        ]);

        // 5. Deploy proxy
        console.log("🔗 Deploying Note3AgentNFTProxy...");
        const Note3AgentNFTProxy = await ethers.getContractFactory("Note3AgentNFTProxy");
        const note3AgentNFTProxy = await Note3AgentNFTProxy.deploy(
            implAddress,
            initData
        );
        await note3AgentNFTProxy.waitForDeployment();
        const proxyAddress = await note3AgentNFTProxy.getAddress();
        console.log("✅ Note3AgentNFTProxy deployed to:", proxyAddress);

        // 6. Test the deployment
        console.log("🧪 Testing deployment...");
        const note3AgentNFT = Note3AgentNFT.attach(proxyAddress);

        // Test basic functions
        const name = await note3AgentNFT.name();
        const symbol = await note3AgentNFT.symbol();
        const verifier = await note3AgentNFT.verifier();
        const version = await note3AgentNFT.VERSION();

        console.log("📊 Contract Info:");
        console.log("  Name:", name);
        console.log("  Symbol:", symbol);
        console.log("  Verifier:", verifier);
        console.log("  Version:", version);

        // Test minting with intelligence config
        console.log("🎯 Testing minting with intelligence config...");
        const testProofs = [
            ethers.keccak256(ethers.toUtf8Bytes("test-proof-1")),
            ethers.keccak256(ethers.toUtf8Bytes("test-proof-2"))
        ];
        const testDescriptions = ["Test Description 1", "Test Description 2"];
        const testNoteId = "test-note-001";
        
        // Intelligence configuration
        const intelligenceConfig = {
            capabilities: ["summary", "qa", "translation"],
            modelVersion: "1.0.0",
            memoryRequirement: 512, // MB
            computeUnits: 1000,
            dataSources: ["ipfs://QmTestData1", "ipfs://QmTestData2"],
            promptTemplate: "You are an AI assistant for note analysis. Please provide helpful summaries and answer questions about the note content.",
            isEncrypted: false
        };

        const mintTx = await note3AgentNFT.mintNote3INFT(
            testProofs,
            testDescriptions,
            testNoteId,
            deployer.address,
            intelligenceConfig
        );
        await mintTx.wait();
        console.log("✅ Test mint successful");

        // Test intelligence functions
        console.log("🧠 Testing intelligence functions...");
        
        try {
            // Generate summary
            const summaryTx = await note3AgentNFT.generateSummary(1);
            await summaryTx.wait();
            console.log("✅ Summary generated");

            // Add Q&A pairs
            const qaTx1 = await note3AgentNFT.addQAPair(1, "What is this note about?", "This is a test note for demonstrating INFT capabilities.");
            await qaTx1.wait();
            
            const qaTx2 = await note3AgentNFT.addQAPair(1, "What are the key features?", "Summary generation, Q&A functionality, and AI-powered analysis.");
            await qaTx2.wait();
            console.log("✅ Q&A pairs added");
        } catch (error) {
            console.log("⚠️  Intelligence functions test failed:", error.message);
        }

        // Test token info
        const tokenId = 1;
        try {
            const tokenName = await note3AgentNFT.getTokenName(tokenId);
            const noteId = await note3AgentNFT.getNoteId(tokenId);
            const owner = await note3AgentNFT.ownerOf(tokenId);
            const tokenURI = await note3AgentNFT.tokenURI(tokenId);

            console.log("📋 Token Info:");
            console.log("  Token ID:", tokenId);
            console.log("  Token Name:", tokenName);
            console.log("  Note ID:", noteId);
            console.log("  Owner:", owner);
            console.log("  Token URI:", tokenURI);
        } catch (error) {
            console.log("⚠️  Token info test failed:", error.message);
        }

        // 7. Update config
        console.log("📝 Updating configuration...");
        const { updateConfig } = require("./update-config");
        await updateConfig({
            INFT_CONTRACT_ADDRESS: proxyAddress,
            VERIFIER_CONTRACT_ADDRESS: verifierAddress,
            IMPLEMENTATION_ADDRESS: implAddress
        });

        console.log("🎉 Deployment completed successfully!");
        console.log("📋 Deployment Summary:");
        console.log("  Note3AgentNFT Proxy:", proxyAddress);
        console.log("  Note3AgentNFT Implementation:", implAddress);
        console.log("  Note3Verifier:", verifierAddress);
        console.log("  Network: 0G Testnet");
        console.log("  Deployer:", deployer.address);

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
