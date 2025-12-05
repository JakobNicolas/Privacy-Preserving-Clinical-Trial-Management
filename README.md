# Privacy-Preserving Clinical Trial Management

> A comprehensive FHEVM example demonstrating privacy-preserving clinical trial management using Fully Homomorphic Encryption (FHE) on the Zama network.

**Zama Bounty Track December 2025 Entry**

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [FHEVM Concepts Demonstrated](#fhevm-concepts-demonstrated)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Contract Architecture](#contract-architecture)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This project demonstrates a complete privacy-preserving clinical trial management system built on FHEVM (Fully Homomorphic Encryption Virtual Machine). It showcases how sensitive medical data can be processed on-chain while maintaining complete privacy through encryption.

Video Demo ：https://streamable.com/argo1h or demo1.mp4+demo2.mp4

Demo Live : https://privacypreserving.vercel.app/

### Problem Statement

Traditional clinical trials face significant privacy challenges:
- Patient health data exposure risks
- Treatment group assignment bias
- Lack of transparent yet confidential result verification
- Regulatory compliance complexity

### Solution

Our FHEVM-based solution provides:
- ✅ **End-to-end encrypted patient data** - All sensitive information remains encrypted on-chain
- ✅ **Blind randomization** - Treatment assignments without revealing to patients or coordinators
- ✅ **Privacy-preserving analytics** - Aggregate statistics without exposing individual records
- ✅ **Verifiable results** - Cryptographically proven outcomes while maintaining confidentiality

---

## Key Features

### 1. Encrypted Patient Enrollment
- **Privacy-preserved demographics**: Age, health scores, and vital signs encrypted using FHE
- **Consent management**: Transparent enrollment while protecting personal data
- **Access control**: Selective permissions for data viewing

### 2. Randomized Treatment Assignment
- **Blind randomization**: FHE-based random number generation ensures unbiased assignment
- **Double-blind integrity**: Neither patients nor coordinators know treatment groups during trial
- **Cryptographically secure**: Randomization cannot be manipulated or predicted

### 3. Confidential Data Collection
- **Weekly measurements**: Encrypted effectiveness scores, side effects, and biomarkers
- **Multiple encrypted values**: Demonstrates handling complex encrypted data structures
- **Temporal tracking**: Time-series data while maintaining privacy

### 4. Phase-Based Workflow
```
Enrollment Phase → Treatment Phase → Monitoring Phase → Analysis Phase
```
Each phase enforces appropriate access controls and operations.

### 5. Privacy-Preserving Results
- **Public decryption**: Aggregate statistics revealed without individual data exposure
- **Statistical analysis**: Group averages computed on encrypted data
- **Result verification**: Cryptographic signatures validate decryption integrity

---

## FHEVM Concepts Demonstrated

This project serves as a comprehensive educational resource for FHEVM development:

### 1. Encryption Operations
```solidity
// Converting plaintext to encrypted values
euint8 encryptedAge = FHE.asEuint8(_age);
euint16 encryptedVitalSigns = FHE.asEuint16(_vitalSigns);
```

**Concept**: `FHE.asEuint8()` and `FHE.asEuint16()` convert plaintext unsigned integers to their encrypted equivalents, allowing storage and computation without revealing values.

### 2. Random Number Generation
```solidity
// Generate encrypted random value for blind treatment assignment
euint8 treatmentGroup = FHE.randEuint8();
```

**Concept**: `FHE.randEuint8()` generates cryptographically secure random encrypted values, perfect for blind randomization in trials.

### 3. Access Control
```solidity
// Grant contract permission to perform operations
FHE.allowThis(encryptedAge);

// Grant patient permission to decrypt their own data
FHE.allow(encryptedAge, patientAddress);
```

**Concept**:
- `FHE.allowThis()` - Grants the contract permission to use encrypted values in computations
- `FHE.allow(value, address)` - Grants a specific address permission to decrypt a value

### 4. Public Decryption
```solidity
// Request decryption of encrypted values for analysis
FHE.requestDecryption(ciphertexts, callbackSelector);
```

**Concept**: Asynchronous decryption pattern allows controlled revelation of encrypted data for aggregate statistics while maintaining individual privacy.

### 5. Signature Verification
```solidity
// Verify decryption results authenticity
FHE.checkSignatures(requestId, data, signatures);
```

**Concept**: Ensures decryption results haven't been tampered with using cryptographic signatures from the KMS (Key Management Service).

### 6. Multiple Encrypted Values
```solidity
struct ClinicalMeasurement {
    euint8 encryptedEffectivenessScore;
    euint8 encryptedSideEffectLevel;
    euint16 encryptedBiomarkers;
}
```

**Concept**: Demonstrates managing multiple encrypted fields within a single data structure, each with independent access control.

---

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Git

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd ConfidentialDrugTrial

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure your environment variables
# PRIVATE_KEY=your_private_key_here
# ZAMA_DEVNET_RPC_URL=https://devnet.zama.ai
```

---

## Quick Start

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

### Deploy to Local Network

```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: Deploy contract
npm run deploy
```

### Deploy to Zama Devnet

```bash
npx hardhat run scripts/deploy.ts --network zamaDevnet
```

---

## Contract Architecture

### Main Contract: `PrivacyPreservingClinicalTrial`

#### Data Structures

**PatientData**
```solidity
struct PatientData {
    euint8 encryptedAge;              // Patient age (18-80)
    euint8 encryptedHealthScore;      // Health metric (0-100)
    euint8 encryptedTreatmentGroup;   // 0=placebo, 1=treatment
    euint16 encryptedVitalSigns;      // Encoded vital signs
    bool hasEnrolled;
    bool consentGiven;
    uint256 enrollmentTime;
    address patientAddress;
}
```

**ClinicalMeasurement**
```solidity
struct ClinicalMeasurement {
    euint8 encryptedEffectivenessScore;  // Treatment effectiveness (0-100)
    euint8 encryptedSideEffectLevel;     // Side effects severity (0-10)
    euint16 encryptedBiomarkers;         // Lab results
    uint256 measurementTime;
    bool isValid;
}
```

**TrialResults**
```solidity
struct TrialResults {
    euint16 placeboGroupAverage;      // Placebo group avg effectiveness
    euint16 treatmentGroupAverage;    // Treatment group avg effectiveness
    euint8 totalParticipants;
    bool resultsCalculated;
    bool trialCompleted;
    uint256 completionTime;
}
```

#### Key Functions

- `enrollPatient()` - Register patient with encrypted personal data
- `submitClinicalData()` - Submit weekly encrypted measurements
- `transitionToNextPhase()` - Progress trial through workflow stages
- `processTrialResults()` - Analyze and publish aggregated results
- `emergencyTermination()` - Emergency stop functionality

---

## Usage Examples

### Example 1: Patient Enrollment

```typescript
import { ethers } from "hardhat";

async function enrollPatient() {
  const trial = await ethers.getContractAt(
    "PrivacyPreservingClinicalTrial",
    contractAddress
  );

  // Patient enrolls with encrypted data
  const tx = await trial.enrollPatient(
    35,      // age
    85,      // health score (0-100)
    12080    // encoded vital signs (HR=120, BP=80)
  );

  await tx.wait();
  console.log("Patient enrolled successfully!");
}
```

### Example 2: Submit Clinical Data

```typescript
async function submitWeeklyData() {
  const trial = await ethers.getContractAt(
    "PrivacyPreservingClinicalTrial",
    contractAddress
  );

  // Submit week 1 measurements
  const tx = await trial.submitClinicalData(
    85,    // effectiveness score (0-100)
    3,     // side effect level (0-10)
    5000,  // biomarkers (encoded)
    1      // week number (1-12)
  );

  await tx.wait();
  console.log("Clinical data submitted!");
}
```

### Example 3: Check Trial Status

```typescript
async function checkStatus() {
  const trial = await ethers.getContractAt(
    "PrivacyPreservingClinicalTrial",
    contractAddress
  );

  const status = await trial.getTrialStatus();
  console.log("Current Phase:", status.phase);
  console.log("Participants:", status.participantCount.toString());
  console.log("Can Transition:", status.canTransition);
}
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run coverage

# Run with gas reporting
REPORT_GAS=true npm test
```

### Test Coverage

The test suite includes:
- ✅ **Deployment tests** - Contract initialization
- ✅ **Enrollment tests** - Patient registration with validation
- ✅ **Clinical data tests** - Multi-week data submission
- ✅ **Phase transition tests** - Workflow progression
- ✅ **Access control tests** - Permission verification
- ✅ **Error handling tests** - Edge cases and invalid inputs
- ✅ **Emergency tests** - Fail-safe mechanisms

### Example Test Output

```
Privacy-Preserving Clinical Trial
  Deployment
    ✓ Should set the correct coordinator
    ✓ Should initialize in ENROLLMENT_PHASE
    ✓ Should set initial phase transition time
  Patient Enrollment
    ✓ Should allow valid patient enrollment
    ✓ Should reject enrollment with invalid age
    ✓ Should prevent double enrollment
    ✓ Should allow multiple different patients to enroll
  Clinical Data Submission
    ✓ Should allow enrolled patient to submit clinical data
    ✓ Should allow multiple weeks of data submission
    ✓ Should prevent duplicate submissions for same week
  Phase Transitions
    ✓ Should transition from Enrollment to Treatment phase
    ✓ Should progress through all phases

29 passing (2.4s)
```

---

## Deployment

### Deploy Script

```typescript
// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Privacy-Preserving Clinical Trial...");

  const Trial = await ethers.getContractFactory(
    "PrivacyPreservingClinicalTrial"
  );
  const trial = await Trial.deploy();
  await trial.waitForDeployment();

  const address = await trial.getAddress();
  console.log("Contract deployed to:", address);

  // Verify contract (optional)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await trial.deploymentTransaction()?.wait(6);

    console.log("Verifying contract...");
    await run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Deployment Commands

```bash
# Local deployment
npx hardhat run scripts/deploy.ts --network hardhat

# Zama Devnet
npx hardhat run scripts/deploy.ts --network zamaDevnet

# Zama Testnet
npx hardhat run scripts/deploy.ts --network zamaTestnet
```

---

## Security Considerations

### Best Practices Implemented

1. **Input Validation**: All user inputs are validated before encryption
2. **Access Control**: Modifiers restrict function access appropriately
3. **Phase Management**: State machine prevents out-of-order operations
4. **Double-Blind Integrity**: Treatment assignments remain confidential
5. **Signature Verification**: Decryption results are cryptographically verified

### Common Pitfalls Avoided

❌ **Anti-pattern**: Using encrypted values in view functions
```solidity
// DON'T: This won't work as expected
function getAge() public view returns (euint8) {
    return patients[msg.sender].encryptedAge;
}
```

✅ **Correct**: Use access control and decryption for viewing
```solidity
// DO: Grant permissions, then decrypt client-side
FHE.allow(encryptedAge, msg.sender);
```

❌ **Anti-pattern**: Missing FHE.allowThis()
```solidity
// DON'T: Contract can't use encrypted value
euint8 value = FHE.asEuint8(42);
// Trying to use 'value' without allowThis() will fail
```

✅ **Correct**: Always grant contract permissions
```solidity
// DO: Grant contract permission first
euint8 value = FHE.asEuint8(42);
FHE.allowThis(value);
```

---

## Project Structure

```
.
├── contracts/
│   └── PrivacyPreservingClinicalTrial.sol
├── test/
│   └── PrivacyPreservingClinicalTrial.test.ts
├── scripts/
│   └── deploy.ts
├── automation/
│   ├── create-example.ts
│   └── generate-docs.ts
├── docs/
│   └── API.md
├── hardhat.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Demo Video

This project includes a comprehensive demo video for the Zama Bounty Track December 2025 competition.

### Video Resources

**📹 Video File**: `demo1.mp4 demo2.mp4`
- Duration: 60 seconds
- Format: 1080p MP4 with narration
- Demonstrates all key FHEVM concepts

**📝 Video Script**: `VIDEO_SCRIPT.md`
- Complete scene-by-scene breakdown
- Technical requirements and recording tips
- Visual and audio synchronization guide
- Post-production checklist

**🎤 Dialogue**: `VIDEO_DIALOGUE.md`
- Full narration text (no timestamps)
- Pronunciation guide for technical terms
- Alternative versions for different focuses
- Tone and delivery guidelines

### Video Contents

The demo video showcases:
1. **Problem Statement** - Privacy challenges in clinical trials
2. **FHEVM Solution** - How FHE encryption solves these issues
3. **Live Demo** - Test execution with 29 passing tests
4. **Architecture** - Four-phase workflow and project structure
5. **Summary** - Key achievements and contributions

All scripts are production-ready for video recording and can be customized based on target audience.

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Zama** - For developing FHEVM technology and hosting the bounty program
- **OpenZeppelin** - For secure smart contract patterns
- **Hardhat** - For excellent development tooling

---

## Resources

- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Solidity Library](https://github.com/zama-ai/fhevm)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

---

## Contact

For questions or support:
- GitHub Issues: [Create an issue](<repository-url>/issues)
- Discussion: [Join the conversation](<repository-url>/discussions)

---

**Built for Zama Bounty Track December 2025** 🏆
