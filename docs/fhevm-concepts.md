# FHEVM Concepts & Patterns

This guide explains the key Fully Homomorphic Encryption (FHE) concepts demonstrated in this project.

## 1. Encryption Operations

### Basic Encryption: FHE.asEuint8() and FHE.asEuint16()

**Concept**: Convert plaintext unsigned integers to encrypted encrypted values.

```solidity
// Convert plaintext uint8 to encrypted euint8
euint8 encryptedAge = FHE.asEuint8(_age);

// Convert plaintext uint16 to encrypted euint16
euint16 encryptedVitalSigns = FHE.asEuint16(_vitalSigns);
```

**Why This Matters**:
- Sensitive data is encrypted immediately upon submission
- Encrypted values can be stored on-chain without revealing plaintext
- No external party can determine the value from the encrypted data
- The contract can perform computations on encrypted values

**Example Use Case**:
```solidity
function enrollPatient(uint8 _age, uint8 _healthScore) external {
    // Encrypt patient's age
    euint8 encryptedAge = FHE.asEuint8(_age);

    // Encrypt health score
    euint8 encryptedHealthScore = FHE.asEuint8(_healthScore);

    // Store encrypted data - even blockchain observers can't see values
    patients[msg.sender].encryptedAge = encryptedAge;
    patients[msg.sender].encryptedHealthScore = encryptedHealthScore;
}
```

### Encryption Types Available

| Type | Range | Use Case |
|------|-------|----------|
| `euint8` | 0-255 | Ages, scores, small integers |
| `euint16` | 0-65,535 | Vital signs, measurements |
| `euint32` | 0-4,294,967,295 | Large values, timestamps |
| `euint64` | 0-18,446,744,073,709,551,615 | Very large numbers |

---

## 2. Random Number Generation

### Encrypted Random Numbers: FHE.randEuint8()

**Concept**: Generate cryptographically secure random numbers while keeping them encrypted.

```solidity
// Generate encrypted random uint8 (0-255)
euint8 randomValue = FHE.randEuint8();

// The randomness is encrypted - no one can predict or manipulate it
treatmentGroup = FHE.randEuint8(); // 0 or 1 after modulo
```

**Why This Matters**:
- Ensures unbiased randomization in trials
- Prevents coordinators from influencing random assignment
- Randomness remains secret until officially revealed
- Perfect for blind trial design

**Blind Randomization Example**:
```solidity
function enrollPatient(uint8 _age, uint8 _healthScore, uint16 _vitalSigns) external {
    // Encrypt personal data
    euint8 encryptedAge = FHE.asEuint8(_age);
    euint8 encryptedHealthScore = FHE.asEuint8(_healthScore);
    euint16 encryptedVitalSigns = FHE.asEuint16(_vitalSigns);

    // CRUCIAL: Blind randomization - no one knows the result
    euint8 encryptedTreatmentGroup = FHE.randEuint8();
    // Now: encryptedTreatmentGroup is encrypted random (0 or 1 per design)
    // - Patient doesn't know their assignment
    // - Coordinator doesn't know the assignment
    // - Only cryptographic operations reveal it at trial end

    // Store everything encrypted
    patients[msg.sender] = PatientData({
        encryptedAge: encryptedAge,
        encryptedHealthScore: encryptedHealthScore,
        encryptedTreatmentGroup: encryptedTreatmentGroup,
        encryptedVitalSigns: encryptedVitalSigns,
        // ... other fields
    });
}
```

---

## 3. Access Control

### Controlling Who Can Decrypt

The FHE system provides two key access control primitives:

#### FHE.allowThis(value)

Grants **the contract itself** permission to use an encrypted value in computations.

```solidity
euint8 encryptedAge = FHE.asEuint8(_age);

// WITHOUT this line, the contract cannot perform operations on encryptedAge
// WITH this line, the contract can use encryptedAge in computations
FHE.allowThis(encryptedAge);
```

**Required for**:
- Storing encrypted values
- Performing operations on encrypted values
- Passing encrypted values to other functions

**Critical Pattern**:
```solidity
// WRONG - Will fail
euint8 value = FHE.asEuint8(42);
// Trying to store or use value will fail

// CORRECT - Must grant permission first
euint8 value = FHE.asEuint8(42);
FHE.allowThis(value);  // Now contract can use it
patients[msg.sender].encryptedData = value; // Works!
```

#### FHE.allow(value, address)

Grants a **specific address** (person) permission to **decrypt** an encrypted value.

```solidity
euint8 encryptedAge = FHE.asEuint8(_age);

// Patient can decrypt their own age
FHE.allow(encryptedAge, msg.sender);

// Note: We deliberately don't grant access to treatment group
// to maintain the blind trial
// FHE.allow(encryptedTreatmentGroup, msg.sender); // NOT called!
```

**Access Control Example in Clinical Trial**:
```solidity
function enrollPatient(uint8 _age, uint8 _healthScore, uint16 _vitalSigns) external {
    euint8 encryptedAge = FHE.asEuint8(_age);
    euint8 encryptedHealthScore = FHE.asEuint8(_healthScore);
    euint16 encryptedVitalSigns = FHE.asEuint16(_vitalSigns);
    euint8 encryptedTreatmentGroup = FHE.randEuint8();

    // STEP 1: Grant contract permissions (required for storage/computation)
    FHE.allowThis(encryptedAge);
    FHE.allowThis(encryptedHealthScore);
    FHE.allowThis(encryptedVitalSigns);
    FHE.allowThis(encryptedTreatmentGroup);

    // STEP 2: Grant selective patient permissions (patient can see own data)
    FHE.allow(encryptedAge, msg.sender);
    FHE.allow(encryptedHealthScore, msg.sender);
    FHE.allow(encryptedVitalSigns, msg.sender);
    // STEP 3: Deliberately withhold treatment group (maintains blind trial)
    // Patient cannot decrypt their treatment group

    // Store encrypted data
    patients[msg.sender] = PatientData({
        encryptedAge: encryptedAge,
        encryptedHealthScore: encryptedHealthScore,
        encryptedTreatmentGroup: encryptedTreatmentGroup,
        encryptedVitalSigns: encryptedVitalSigns,
        hasEnrolled: true,
        consentGiven: true,
        enrollmentTime: block.timestamp,
        patientAddress: msg.sender
    });
}
```

**Access Control Matrix for Clinical Trial**:

| Value | Patient Can Decrypt | Contract Can Use | Coordinator Can Decrypt |
|-------|-------------------|------------------|----------------------|
| Age | ✅ Yes | ✅ Yes | ❌ No |
| Health Score | ✅ Yes | ✅ Yes | ❌ No |
| Treatment Group | ❌ No | ✅ Yes | ❌ No (until trial ends) |
| Vital Signs | ✅ Yes | ✅ Yes | ❌ No |
| Effectiveness Score | ✅ Yes | ✅ Yes | ❌ No (until analysis) |

---

## 4. Public Decryption for Analytics

### Requesting Decryption: FHE.requestDecryption()

**Concept**: Asynchronously request decryption of encrypted values for aggregate analysis.

```solidity
// Request decryption of multiple effectiveness scores
bytes32[] memory encryptedValues = new bytes32[](scores.length);
for (uint i = 0; i < scores.length; i++) {
    encryptedValues[i] = FHE.toBytes32(effectivenessScores[i]);
}

// Asynchronously request decryption
// Results will be passed to processTrialResults callback
FHE.requestDecryption(encryptedValues, this.processTrialResults.selector);
```

**Why This Matters**:
- Individual scores remain encrypted until trial completion
- Results are computed off-chain but verified on-chain
- Enables privacy-preserving statistics
- Creates transparent yet confidential reporting

**Privacy-Preserving Analysis Pattern**:
```solidity
// Phase 1: During trial - all data encrypted
function submitClinicalData(uint8 effectiveness, ...) external {
    // Store encrypted effectiveness score
    measurements[msg.sender][week].encryptedEffectivenessScore =
        FHE.asEuint8(effectiveness);
}

// Phase 2: Trial complete - request aggregate analysis
function initiateResultsAnalysis() external {
    // Request decryption of all effectiveness scores
    bytes32[] memory values = new bytes32[](enrolledPatients.length);
    for (uint i = 0; i < enrolledPatients.length; i++) {
        values[i] = FHE.toBytes32(measurements[enrolledPatients[i]][4].encryptedEffectivenessScore);
    }

    // Schedule asynchronous decryption and processing
    FHE.requestDecryption(values, this.processTrialResults.selector);
}

// Phase 3: Results computed - aggregate statistics revealed
function processTrialResults(
    uint256 requestId,
    uint8[] memory effectivenessScores,
    bytes[] memory signatures
) external {
    // Verify signatures - ensures results haven't been tampered with
    FHE.checkSignatures(requestId, abi.encode(effectivenessScores), abi.encode(signatures));

    // Compute group averages from decrypted individual scores
    uint16 placeboTotal = 0;
    uint16 treatmentTotal = 0;

    for (uint i = 0; i < effectivenessScores.length; i++) {
        if (isPlaceboGroup(enrolledPatients[i])) {
            placeboTotal += effectivenessScores[i];
        } else {
            treatmentTotal += effectivenessScores[i];
        }
    }

    // Store averages (now encrypted again for security)
    phaseResults[4] = TrialResults({
        placeboGroupAverage: FHE.asEuint16(placeboTotal / placeboCount),
        treatmentGroupAverage: FHE.asEuint16(treatmentTotal / treatmentCount),
        // ...
    });
}
```

---

## 5. Multiple Encrypted Values

### Managing Complex Data Structures

**Concept**: Encrypt multiple related fields within a single data structure.

```solidity
struct ClinicalMeasurement {
    euint8 encryptedEffectivenessScore;  // 0-100
    euint8 encryptedSideEffectLevel;     // 0-10
    euint16 encryptedBiomarkers;         // Lab results
    uint256 measurementTime;              // Not encrypted (timestamp)
    bool isValid;                         // Not encrypted (flag)
}
```

**Why This Matters**:
- Allows encrypting only sensitive fields
- Public/non-sensitive data remains public
- Each encrypted field has independent access control
- Efficient storage of multi-faceted data

**Example Usage**:
```solidity
function submitClinicalData(
    uint8 _effectivenessScore,
    uint8 _sideEffectLevel,
    uint16 _biomarkers,
    uint8 _week
) external onlyEnrolledPatient onlyDuringPhase(TREATMENT_PHASE) {
    // Encrypt clinical measurements
    euint8 encryptedEffectiveness = FHE.asEuint8(_effectivenessScore);
    euint8 encryptedSideEffects = FHE.asEuint8(_sideEffectLevel);
    euint16 encryptedBiomarkers = FHE.asEuint16(_biomarkers);

    // Create measurement with mixed encrypted and public data
    ClinicalMeasurement memory measurement = ClinicalMeasurement({
        encryptedEffectivenessScore: encryptedEffectiveness,
        encryptedSideEffectLevel: encryptedSideEffects,
        encryptedBiomarkers: encryptedBiomarkers,
        measurementTime: block.timestamp,  // Public timestamp
        isValid: true                      // Public validation flag
    });

    // Grant permissions for each encrypted field
    FHE.allowThis(encryptedEffectiveness);
    FHE.allowThis(encryptedSideEffects);
    FHE.allowThis(encryptedBiomarkers);

    // Store measurement
    measurements[msg.sender][_week] = measurement;
}
```

---

## 6. Signature Verification

### Validating Decryption Results: FHE.checkSignatures()

**Concept**: Cryptographically verify that decryption results haven't been tampered with.

```solidity
function processTrialResults(
    uint256 requestId,
    uint8[] memory effectivenessScores,
    bytes[] memory signatures
) external {
    // Verify that these decrypted values are authentic
    // Prevents man-in-the-middle attacks on decryption results
    FHE.checkSignatures(
        requestId,
        abi.encode(effectivenessScores),
        abi.encode(signatures)
    );

    // Only process if signatures are valid
    // Continue with analysis...
}
```

---

## Common Pitfalls to Avoid

### ❌ Pitfall 1: Missing FHE.allowThis()

```solidity
// WRONG - Will fail
euint8 value = FHE.asEuint8(42);
patients[msg.sender].encryptedData = value;  // ERROR!

// CORRECT
euint8 value = FHE.asEuint8(42);
FHE.allowThis(value);  // Grant contract permission
patients[msg.sender].encryptedData = value;  // Works!
```

### ❌ Pitfall 2: Revealing Encrypted Values Accidentally

```solidity
// WRONG - Doesn't work as expected
function getAge(address patient) public view returns (euint8) {
    return patients[patient].encryptedAge;  // Can't return encrypted value!
}

// CORRECT - Use access control
function getAge(address patient) public {
    FHE.allow(patients[patient].encryptedAge, msg.sender);
    // Patient must decrypt client-side using KMS
}
```

### ❌ Pitfall 3: Overgranting Permissions

```solidity
// WRONG - Reveals treatment group (breaks blind trial)
FHE.allow(encryptedTreatmentGroup, msg.sender);  // Don't do this!

// CORRECT - Keep treatment group secret
// Only decrypt at trial completion for analysis
```

---

## Testing FHE Operations

### Unit Testing with Encrypted Values

```typescript
it("Should encrypt and store patient data", async function () {
    // Submit encrypted enrollment
    await trial.enrollPatient(35, 85, 12080);

    // Verify patient is enrolled (public data)
    const status = await trial.getPatientStatus(patient1.address);
    expect(status.enrolled).to.be.true;

    // Note: Cannot directly test encrypted values
    // They remain encrypted on-chain
});

it("Should maintain blind trial design", async function () {
    // Patient enrolls
    await trial.enrollPatient(35, 85, 12080);

    // Treatment assignment is random and encrypted
    // Even after enrollment, patient cannot see their group
    // Only revealed at trial completion
});
```

---

## Summary

| Concept | Operation | Purpose |
|---------|-----------|---------|
| **Encryption** | `FHE.asEuint8/16` | Store data privately |
| **Randomization** | `FHE.randEuint8` | Blind assignment |
| **Contract Permissions** | `FHE.allowThis` | Enable computations |
| **User Permissions** | `FHE.allow` | Selective decryption |
| **Public Analysis** | `FHE.requestDecryption` | Aggregate statistics |
| **Verification** | `FHE.checkSignatures` | Validate results |

These concepts work together to create a privacy-preserving system where:
1. Data stays encrypted (no exposure)
2. Operations are transparent (verifiable)
3. Privacy is maintained (selective decryption)
4. Security is cryptographic (impossible to forge)
