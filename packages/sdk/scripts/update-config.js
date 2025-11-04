const fs = require('fs');
const path = require('path');

/**
 * Update configuration files with deployed contract addresses
 * Supports both legacy signature (verifier, inft) and object payload.
 */
function updateConfig(arg1, arg2) {
  console.log('📝 Updating configuration files...');

  let verifierAddress;
  let inftAddress;
  let implementationAddress;

  if (typeof arg1 === 'object' && arg1) {
    verifierAddress = arg1.VERIFIER_CONTRACT_ADDRESS || arg1.verifier || arg1.oracleAddress || '';
    inftAddress = arg1.INFT_CONTRACT_ADDRESS || arg1.inft || arg2 || '';
    implementationAddress = arg1.IMPLEMENTATION_ADDRESS || arg1.impl || '';
  } else {
    verifierAddress = arg1;
    inftAddress = arg2;
  }

  if (!verifierAddress || !inftAddress) {
    console.warn('⚠️ Missing verifier or INFT address. Received:', { verifierAddress, inftAddress });
  }

  // Update root .env.example
  const envExamplePath = path.join(__dirname, '..', '..', '..', 'env.example');
  let envExample = fs.readFileSync(envExamplePath, 'utf8');

  envExample = envExample.replace(
    /NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=.*/,
    `NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=${inftAddress}`
  );

  envExample = envExample.replace(
    /NEXT_PUBLIC_VERIFIER_CONTRACT_ADDRESS=.*/,
    `NEXT_PUBLIC_VERIFIER_CONTRACT_ADDRESS=${verifierAddress}`
  );

  fs.writeFileSync(envExamplePath, envExample);
  console.log('✅ Updated env.example');

  // Update SDK INFT contract address constant
  const inftPath = path.join(__dirname, '..', 'src', 'inft.ts');
  let inftCode = fs.readFileSync(inftPath, 'utf8');

  inftCode = inftCode.replace(
    /const INFT_CONTRACT_ADDRESS = '0x[0-9a-fA-F]+';/,
    `const INFT_CONTRACT_ADDRESS = '${inftAddress}';`
  );

  fs.writeFileSync(inftPath, inftCode);
  console.log('✅ Updated SDK INFT contract address');

  // Create deployment info file (mainnet)
  const deploymentInfo = {
    network: '0G Mainnet',
    chainId: 16661,
    verifier: verifierAddress,
    inft: inftAddress,
    implementation: implementationAddress,
    deployedAt: new Date().toISOString(),
    explorer: {
      verifier: verifierAddress ? `https://chainscan.0g.ai/address/${verifierAddress}` : '',
      inft: inftAddress ? `https://chainscan.0g.ai/address/${inftAddress}` : '',
      implementation: implementationAddress ? `https://chainscan.0g.ai/address/${implementationAddress}` : ''
    }
  };

  const deploymentPath = path.join(__dirname, '..', 'deployment-info.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log('✅ Created deployment-info.json');

  console.log('\n🎉 Configuration updated successfully!');
  console.log('📋 Next steps:');
  console.log('1. Copy the contract addresses to your apps/web/.env.local file');
  console.log('2. Restart your development server');
  console.log('3. Test the INFT functionality in your frontend');
}

module.exports = { updateConfig };
