require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
        solidity: {
            compilers: [
                {
                    version: "0.8.21",
                    settings: {
                        evmVersion: "shanghai",
                        optimizer: {
                            enabled: true,
                            runs: 200
                        },
                        viaIR: true
                    }
                },
                {
                    version: "0.8.22",
                    settings: {
                        evmVersion: "shanghai",
                        optimizer: {
                            enabled: true,
                            runs: 200
                        },
                        viaIR: true
                    }
                }
            ]
        },
  networks: {
    "0g-testnet": {
      url: "https://evmrpc-testnet.0g.ai/",
      chainId: 16602,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto"
    },
    "0g-mainnet": {
      url: "https://evmrpc.0g.ai/",
      chainId: 16661,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto"
    },
    hardhat: {
      chainId: 1337
    }
  },
  etherscan: {
    apiKey: {
      "0g-testnet": "your-api-key-here", // 0G Chain Scan API key if available
      "0g-mainnet": "your-api-key-here"
    },
    customChains: [
      {
        network: "0g-testnet",
        chainId: 16602,
        urls: {
          apiURL: "https://chainscan-galileo.0g.ai/api",
          browserURL: "https://chainscan-galileo.0g.ai"
        }
      },
      {
        network: "0g-mainnet",
        chainId: 16661,
        urls: {
          apiURL: "https://chainscan.0g.ai/api",
          browserURL: "https://chainscan.0g.ai"
        }
      }
    ]
  },
  paths: {
    sources: "./src/contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
