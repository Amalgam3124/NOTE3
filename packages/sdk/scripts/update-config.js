const fs = require('fs');
const path = require('path');

/**
 * Update configuration files with deployed contract addresses
 */
function updateConfig(oracleAddress, inftAddress) {
  console.log('📝 Updating configuration files...');

  // Update .env.example
  const envExamplePath = path.join(__dirname, '..', '..', '..', 'env.example');
  let envExample = fs.readFileSync(envExamplePath, 'utf8');
  
  envExample = envExample.replace(
    /NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=.*/,
    `NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=${inftAddress}`
  );
  
  envExample = envExample.replace(
    /NEXT_PUBLIC_ORACLE_CONTRACT_ADDRESS=.*/,
    `NEXT_PUBLIC_ORACLE_CONTRACT_ADDRESS=${oracleAddress}`
  );
  
  fs.writeFileSync(envExamplePath, envExample);
  console.log('✅ Updated env.example');

  // Update SDK INFT contract address
  const inftPath = path.join(__dirname, '..', 'src', 'inft.ts');
  let inftCode = fs.readFileSync(inftPath, 'utf8');
  
  inftCode = inftCode.replace(
    /const INFT_CONTRACT_ADDRESS = .*;/,
    `const INFT_CONTRACT_ADDRESS = '${inftAddress}';`
  );
  
  fs.writeFileSync(inftPath, inftCode);
  console.log('✅ Updated SDK INFT contract address');

  // Create deployment info file
  const deploymentInfo = {
    network: '0G Galileo Testnet',
    chainId: 16601,
    oracleAddress,
    inftAddress,
    deployedAt: new Date().toISOString(),
    explorer: {
      oracle: `https://chainscan-galileo.0g.ai/address/${oracleAddress}`,
      inft: `https://chainscan-galileo.0g.ai/address/${inftAddress}`
    }
  };

  const deploymentPath = path.join(__dirname, '..', 'deployment-info.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log('✅ Created deployment-info.json');

  console.log('\n🎉 Configuration updated successfully!');
  console.log('📋 Next steps:');
  console.log('1. Copy the contract addresses to your .env.local file');
  console.log('2. Restart your development server');
  console.log('3. Test the INFT functionality in your frontend');
}

module.exports = { updateConfig };
