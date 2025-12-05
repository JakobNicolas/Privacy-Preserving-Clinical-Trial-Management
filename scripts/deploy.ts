import { ethers, network, run } from "hardhat";

/**
 * @title Privacy-Preserving Clinical Trial Deployment Script
 * @notice Deploys the clinical trial contract to specified network
 *
 * @chapter: deployment
 * @category: scripts
 *
 * Usage:
 * - Local: npx hardhat run scripts/deploy.ts --network hardhat
 * - Devnet: npx hardhat run scripts/deploy.ts --network zamaDevnet
 * - Testnet: npx hardhat run scripts/deploy.ts --network zamaTestnet
 */

async function main() {
  console.log("=".repeat(60));
  console.log("Privacy-Preserving Clinical Trial - Deployment");
  console.log("=".repeat(60));

  // Get network information
  console.log(`\nNetwork: ${network.name}`);
  console.log(`Chain ID: ${network.config.chainId}`);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log(`\nDeployer: ${deployerAddress}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Check sufficient balance
  if (balance === 0n) {
    console.error("\n❌ Error: Deployer has no balance!");
    process.exit(1);
  }

  console.log("\n" + "-".repeat(60));
  console.log("Deploying PrivacyPreservingClinicalTrial...");
  console.log("-".repeat(60));

  // Deploy contract
  const TrialFactory = await ethers.getContractFactory(
    "PrivacyPreservingClinicalTrial"
  );
  const trial = await TrialFactory.deploy();

  console.log("\n⏳ Waiting for deployment transaction...");
  await trial.waitForDeployment();

  const contractAddress = await trial.getAddress();

  console.log("\n" + "=".repeat(60));
  console.log("✅ Deployment Successful!");
  console.log("=".repeat(60));
  console.log(`\nContract Address: ${contractAddress}`);
  console.log(`Deployer (Trial Coordinator): ${deployerAddress}`);
  console.log(`Network: ${network.name}`);

  // Get initial contract state
  const currentPhase = await trial.currentTrialPhase();
  const phaseName = await trial.getCurrentPhaseName();
  const startTime = await trial.trialStartTime();

  console.log("\n" + "-".repeat(60));
  console.log("Initial Contract State:");
  console.log("-".repeat(60));
  console.log(`Current Phase: ${currentPhase} (${phaseName})`);
  console.log(`Trial Start Time: ${new Date(Number(startTime) * 1000).toISOString()}`);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    contractAddress: contractAddress,
    deployer: deployerAddress,
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    transactionHash: trial.deploymentTransaction()?.hash,
  };

  console.log("\n" + "-".repeat(60));
  console.log("Deployment Information:");
  console.log("-".repeat(60));
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verify contract on explorer (skip for local networks)
  if (
    network.name !== "hardhat" &&
    network.name !== "localhost" &&
    process.env.VERIFY_CONTRACTS === "true"
  ) {
    console.log("\n" + "-".repeat(60));
    console.log("Verifying contract on block explorer...");
    console.log("-".repeat(60));

    // Wait for a few block confirmations
    console.log("⏳ Waiting for 6 block confirmations...");
    await trial.deploymentTransaction()?.wait(6);

    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("ℹ️  Contract is already verified");
      } else {
        console.error("❌ Verification failed:", error.message);
      }
    }
  }

  // Display usage instructions
  console.log("\n" + "=".repeat(60));
  console.log("Next Steps:");
  console.log("=".repeat(60));
  console.log(`
1. Patient Enrollment (During Enrollment Phase):
   await trial.enrollPatient(age, healthScore, vitalSigns);

2. Transition to Treatment Phase (after ${3600}s):
   await trial.transitionToNextPhase();

3. Submit Clinical Data (During Treatment Phase):
   await trial.submitClinicalData(effectiveness, sideEffects, biomarkers, week);

4. Check Trial Status:
   await trial.getTrialStatus();

5. Get Patient Status:
   await trial.getPatientStatus(patientAddress);
  `);

  console.log("=".repeat(60));
  console.log("Deployment Complete! 🎉");
  console.log("=".repeat(60) + "\n");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n" + "=".repeat(60));
    console.error("❌ Deployment Failed!");
    console.error("=".repeat(60));
    console.error(error);
    process.exit(1);
  });
