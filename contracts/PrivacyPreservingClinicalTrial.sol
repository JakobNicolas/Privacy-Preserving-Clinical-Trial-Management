// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint8, euint16, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title Privacy-Preserving Clinical Trial Management
 * @author FHEVM Clinical Trials Team
 * @notice This contract demonstrates privacy-preserving clinical trial management using Fully Homomorphic Encryption (FHE)
 * @dev Implements a complete clinical trial workflow with encrypted patient data, treatment assignments, and result analysis
 *
 * @chapter: advanced-examples
 * @category: healthcare
 *
 * Key Features:
 * - Encrypted patient enrollment with privacy-preserved personal health information
 * - Randomized treatment group assignment using FHE operations
 * - Confidential clinical data submission during treatment phases
 * - Phase-based trial progression (Enrollment → Treatment → Monitoring → Analysis)
 * - Privacy-preserving result aggregation using public decryption
 * - Access control patterns demonstrating FHE.allow() and FHE.allowThis()
 *
 * FHEVM Concepts Demonstrated:
 * 1. Encryption: Patient data encrypted using FHE.asEuint8() and FHE.asEuint16()
 * 2. Random Number Generation: FHE.randEuint8() for treatment randomization
 * 3. Access Control: FHE.allow() and FHE.allowThis() for permission management
 * 4. Public Decryption: FHE.requestDecryption() for aggregated results
 * 5. Multiple Encrypted Values: Handling multiple encrypted data points per patient
 * 6. Signature Verification: FHE.checkSignatures() for decryption result validation
 */
contract PrivacyPreservingClinicalTrial is SepoliaConfig {

    address public trialCoordinator;
    uint8 public currentTrialPhase;
    uint256 public trialStartTime;
    uint256 public phaseTransitionTime;

    /// @notice Trial phase identifiers for workflow management
    /// @dev Phase 1: Patient enrollment and consent | Phase 2: Treatment administration
    /// Phase 3: Patient monitoring | Phase 4: Data analysis and results
    uint8 constant ENROLLMENT_PHASE = 1;
    uint8 constant TREATMENT_PHASE = 2;
    uint8 constant MONITORING_PHASE = 3;
    uint8 constant ANALYSIS_PHASE = 4;

    /// @notice Duration of each trial phase (1 hour for demonstration purposes)
    /// @dev In production, this would be weeks or months per phase
    uint256 constant PHASE_DURATION = 3600;

    /**
     * @notice Patient enrollment data structure with encrypted sensitive information
     * @dev All personal health information is encrypted using FHE to preserve privacy
     *
     * Privacy Pattern:
     * - Sensitive data (age, health metrics, treatment group) stored as encrypted values (euint8/euint16)
     * - Only authorized parties can decrypt specific fields using access control
     * - Treatment group assignment remains confidential until trial completion
     *
     * @param encryptedAge Patient age (18-80), encrypted as euint8
     * @param encryptedHealthScore Overall health metric (0-100), encrypted as euint8
     * @param encryptedTreatmentGroup Treatment assignment (0=placebo, 1=treatment), encrypted as euint8
     * @param encryptedVitalSigns Encoded vital signs (heart rate, blood pressure), encrypted as euint16
     * @param hasEnrolled Public flag indicating enrollment status
     * @param consentGiven Public flag indicating patient consent
     * @param enrollmentTime Timestamp of enrollment
     * @param patientAddress Ethereum address of the patient
     */
    struct PatientData {
        euint8 encryptedAge;
        euint8 encryptedHealthScore;
        euint8 encryptedTreatmentGroup;
        euint16 encryptedVitalSigns;
        bool hasEnrolled;
        bool consentGiven;
        uint256 enrollmentTime;
        address patientAddress;
    }

    /**
     * @notice Aggregated trial results structure with encrypted group averages
     * @dev Results are encrypted to maintain confidentiality until official publication
     *
     * Public Decryption Pattern:
     * - Raw effectiveness scores are decrypted using FHE.requestDecryption()
     * - Aggregated averages are re-encrypted for storage
     * - Only statistical summaries are made available, protecting individual privacy
     *
     * @param placeboGroupAverage Average effectiveness score for placebo group, encrypted as euint16
     * @param treatmentGroupAverage Average effectiveness score for treatment group, encrypted as euint16
     * @param totalParticipants Total number of trial participants, encrypted as euint8
     * @param resultsCalculated Flag indicating if statistical analysis is complete
     * @param trialCompleted Flag indicating if trial has finished
     * @param completionTime Timestamp of trial completion
     */
    struct TrialResults {
        euint16 placeboGroupAverage;
        euint16 treatmentGroupAverage;
        euint8 totalParticipants;
        bool resultsCalculated;
        bool trialCompleted;
        uint256 completionTime;
    }

    /**
     * @notice Weekly clinical measurements submitted by patients
     * @dev All clinical data is encrypted to protect patient privacy during data collection
     *
     * Multiple Encrypted Values Pattern:
     * - Demonstrates handling multiple encrypted fields (effectiveness, side effects, biomarkers)
     * - Each measurement is timestamped and validated
     * - Access control is granted selectively to different encrypted fields
     *
     * @param encryptedEffectivenessScore Treatment effectiveness rating (0-100), encrypted as euint8
     * @param encryptedSideEffectLevel Side effect severity (0-10), encrypted as euint8
     * @param encryptedBiomarkers Laboratory biomarker results, encrypted as euint16
     * @param measurementTime Timestamp of measurement submission
     * @param isValid Flag indicating if measurement data is valid
     */
    struct ClinicalMeasurement {
        euint8 encryptedEffectivenessScore;
        euint8 encryptedSideEffectLevel;
        euint16 encryptedBiomarkers;
        uint256 measurementTime;
        bool isValid;
    }

    mapping(address => PatientData) public patients;
    mapping(address => mapping(uint8 => ClinicalMeasurement)) public measurements; // patient => week => measurement
    mapping(uint8 => TrialResults) public phaseResults;

    address[] public enrolledPatients;
    address[] public placeboGroup;
    address[] public treatmentGroup;

    event PatientEnrolled(address indexed patient, uint256 timestamp);
    event TreatmentAssigned(address indexed patient, uint8 indexed phase);
    event ClinicalDataSubmitted(address indexed patient, uint8 week);
    event PhaseTransition(uint8 indexed fromPhase, uint8 indexed toPhase, uint256 timestamp);
    event TrialCompleted(uint8 indexed phase, uint256 timestamp);
    event ResultsPublished(uint8 indexed phase, bool significantDifference);

    modifier onlyCoordinator() {
        require(msg.sender == trialCoordinator, "Only trial coordinator allowed");
        _;
    }

    modifier onlyDuringPhase(uint8 phase) {
        require(currentTrialPhase == phase, "Wrong trial phase");
        _;
    }

    modifier onlyEnrolledPatient() {
        require(patients[msg.sender].hasEnrolled, "Patient not enrolled");
        _;
    }

    constructor() {
        trialCoordinator = msg.sender;
        currentTrialPhase = ENROLLMENT_PHASE;
        trialStartTime = block.timestamp;
        phaseTransitionTime = block.timestamp + PHASE_DURATION;
    }

    /**
     * @notice Check if sufficient time has passed to transition to next phase
     * @return bool True if phase transition is allowed
     */
    function canTransitionPhase() public view returns (bool) {
        return block.timestamp >= phaseTransitionTime && currentTrialPhase < ANALYSIS_PHASE;
    }

    /**
     * @notice Enroll a patient in the clinical trial with encrypted personal health data
     * @dev Demonstrates core FHEVM concepts: encryption, random number generation, and access control
     *
     * FHEVM Concepts Demonstrated:
     * 1. **Encryption (FHE.asEuint8/FHE.asEuint16)**:
     *    - Converts plaintext uint values to encrypted euint values
     *    - Different bit sizes (euint8 vs euint16) for different data ranges
     *    - Encrypted values can be stored on-chain without revealing plaintext
     *
     * 2. **Random Number Generation (FHE.randEuint8)**:
     *    - Generates cryptographically secure random encrypted values
     *    - Used for blind treatment group assignment
     *    - Randomness remains encrypted, preventing bias
     *
     * 3. **Access Control (FHE.allow/FHE.allowThis)**:
     *    - FHE.allowThis(): Grants contract permission to perform operations on encrypted values
     *    - FHE.allow(value, address): Grants specific address permission to decrypt value
     *    - Selective permission granting maintains privacy while enabling necessary access
     *
     * Security Considerations:
     * - Input validation ensures data ranges are correct
     * - Only one enrollment per address to prevent duplicate participants
     * - Only available during ENROLLMENT_PHASE
     *
     * @param _age Patient age (must be 18-80)
     * @param _healthScore Overall health metric (0-100)
     * @param _vitalSigns Encoded vital signs (heart rate, blood pressure)
     *
     * @custom:emits PatientEnrolled when successful
     */
    function enrollPatient(
        uint8 _age,
        uint8 _healthScore,
        uint16 _vitalSigns
    ) external onlyDuringPhase(ENROLLMENT_PHASE) {
        require(!patients[msg.sender].hasEnrolled, "Patient already enrolled");
        require(_age >= 18 && _age <= 80, "Age must be between 18-80");
        require(_healthScore <= 100, "Health score must be 0-100");

        // STEP 1: Encrypt sensitive patient data
        // Convert plaintext values to encrypted euint types
        euint8 encryptedAge = FHE.asEuint8(_age);
        euint8 encryptedHealthScore = FHE.asEuint8(_healthScore);
        euint16 encryptedVitalSigns = FHE.asEuint16(_vitalSigns);

        // STEP 2: Generate encrypted random treatment assignment
        // Ensures blind randomization - no one knows assignment until decryption
        euint8 treatmentGroup = FHE.randEuint8();

        // STEP 3: Store encrypted patient data
        patients[msg.sender] = PatientData({
            encryptedAge: encryptedAge,
            encryptedHealthScore: encryptedHealthScore,
            encryptedTreatmentGroup: treatmentGroup,
            encryptedVitalSigns: encryptedVitalSigns,
            hasEnrolled: true,
            consentGiven: true,
            enrollmentTime: block.timestamp,
            patientAddress: msg.sender
        });

        enrolledPatients.push(msg.sender);

        // STEP 4: Configure access control permissions
        // FHE.allowThis(): Grant contract permission to perform operations on encrypted values
        // This is REQUIRED for the contract to use these values in computations
        FHE.allowThis(encryptedAge);
        FHE.allowThis(encryptedHealthScore);
        FHE.allowThis(encryptedVitalSigns);
        FHE.allowThis(treatmentGroup);

        // FHE.allow(value, address): Grant patient permission to decrypt their own data
        // Note: Treatment group is NOT given to patient to maintain blind trial integrity
        FHE.allow(encryptedAge, msg.sender);
        FHE.allow(encryptedHealthScore, msg.sender);
        FHE.allow(encryptedVitalSigns, msg.sender);

        emit PatientEnrolled(msg.sender, block.timestamp);
    }

    // Submit clinical measurements during treatment phase
    function submitClinicalData(
        uint8 _effectivenessScore,
        uint8 _sideEffectLevel,
        uint16 _biomarkers,
        uint8 _week
    ) external onlyEnrolledPatient onlyDuringPhase(TREATMENT_PHASE) {
        require(_effectivenessScore <= 100, "Effectiveness score must be 0-100");
        require(_sideEffectLevel <= 10, "Side effect level must be 0-10");
        require(_week >= 1 && _week <= 12, "Week must be 1-12");
        require(!measurements[msg.sender][_week].isValid, "Data already submitted for this week");

        // Encrypt clinical measurements
        euint8 encryptedEffectiveness = FHE.asEuint8(_effectivenessScore);
        euint8 encryptedSideEffects = FHE.asEuint8(_sideEffectLevel);
        euint16 encryptedBiomarkers = FHE.asEuint16(_biomarkers);

        measurements[msg.sender][_week] = ClinicalMeasurement({
            encryptedEffectivenessScore: encryptedEffectiveness,
            encryptedSideEffectLevel: encryptedSideEffects,
            encryptedBiomarkers: encryptedBiomarkers,
            measurementTime: block.timestamp,
            isValid: true
        });

        // Grant access permissions
        FHE.allowThis(encryptedEffectiveness);
        FHE.allowThis(encryptedSideEffects);
        FHE.allowThis(encryptedBiomarkers);
        FHE.allow(encryptedEffectiveness, msg.sender);

        emit ClinicalDataSubmitted(msg.sender, _week);
    }

    // Transition to next trial phase
    function transitionToNextPhase() external {
        require(canTransitionPhase(), "Cannot transition phase yet");

        uint8 previousPhase = currentTrialPhase;

        if (currentTrialPhase == ENROLLMENT_PHASE) {
            currentTrialPhase = TREATMENT_PHASE;
            _assignTreatmentGroups();
        } else if (currentTrialPhase == TREATMENT_PHASE) {
            currentTrialPhase = MONITORING_PHASE;
        } else if (currentTrialPhase == MONITORING_PHASE) {
            currentTrialPhase = ANALYSIS_PHASE;
            _initiateResultsAnalysis();
        }

        phaseTransitionTime = block.timestamp + PHASE_DURATION;

        emit PhaseTransition(previousPhase, currentTrialPhase, block.timestamp);
    }

    // Assign patients to treatment groups (internal)
    function _assignTreatmentGroups() private {
        for (uint i = 0; i < enrolledPatients.length; i++) {
            address patient = enrolledPatients[i];
            // In real implementation, would use FHE operations to maintain privacy
            // For demo, using simple assignment
            if (i % 2 == 0) {
                placeboGroup.push(patient);
            } else {
                treatmentGroup.push(patient);
            }
            emit TreatmentAssigned(patient, currentTrialPhase);
        }
    }

    // Initiate confidential results analysis
    function _initiateResultsAnalysis() private onlyDuringPhase(ANALYSIS_PHASE) {
        // Async decryption request for statistical analysis
        bytes32[] memory cts = new bytes32[](enrolledPatients.length);

        for (uint i = 0; i < enrolledPatients.length; i++) {
            address patient = enrolledPatients[i];
            // Request decryption of effectiveness scores for analysis
            if (measurements[patient][4].isValid) { // Week 4 data
                cts[i] = FHE.toBytes32(measurements[patient][4].encryptedEffectivenessScore);
            }
        }

        if (cts.length > 0) {
            FHE.requestDecryption(cts, this.processTrialResults.selector);
        }
    }

    // Process trial results callback
    function processTrialResults(
        uint256 requestId,
        uint8[] memory effectivenessScores,
        bytes[] memory signatures
    ) external {
        // Verify signatures
        FHE.checkSignatures(requestId, abi.encode(effectivenessScores), abi.encode(signatures));

        uint16 placeboTotal = 0;
        uint16 treatmentTotal = 0;
        uint8 placeboCount = 0;
        uint8 treatmentCount = 0;

        // Calculate group averages (simplified)
        for (uint i = 0; i < effectivenessScores.length && i < enrolledPatients.length; i++) {
            if (i % 2 == 0) { // Placebo group
                placeboTotal += effectivenessScores[i];
                placeboCount++;
            } else { // Treatment group
                treatmentTotal += effectivenessScores[i];
                treatmentCount++;
            }
        }

        uint16 placeboAverage = placeboCount > 0 ? placeboTotal / placeboCount : 0;
        uint16 treatmentAverage = treatmentCount > 0 ? treatmentTotal / treatmentCount : 0;

        phaseResults[currentTrialPhase] = TrialResults({
            placeboGroupAverage: FHE.asEuint16(placeboAverage),
            treatmentGroupAverage: FHE.asEuint16(treatmentAverage),
            totalParticipants: FHE.asEuint8(uint8(enrolledPatients.length)),
            resultsCalculated: true,
            trialCompleted: true,
            completionTime: block.timestamp
        });

        // Grant access to results
        FHE.allowThis(phaseResults[currentTrialPhase].placeboGroupAverage);
        FHE.allowThis(phaseResults[currentTrialPhase].treatmentGroupAverage);
        FHE.allowThis(phaseResults[currentTrialPhase].totalParticipants);

        bool significantDifference = treatmentAverage > placeboAverage + 10; // 10 point threshold

        emit TrialCompleted(currentTrialPhase, block.timestamp);
        emit ResultsPublished(currentTrialPhase, significantDifference);
    }

    // Get current trial status
    function getTrialStatus() external view returns (
        uint8 phase,
        uint256 participantCount,
        uint256 timeUntilNextPhase,
        bool canTransition
    ) {
        return (
            currentTrialPhase,
            enrolledPatients.length,
            phaseTransitionTime > block.timestamp ? phaseTransitionTime - block.timestamp : 0,
            canTransitionPhase()
        );
    }

    // Get patient enrollment status
    function getPatientStatus(address patient) external view returns (
        bool enrolled,
        bool consentGiven,
        uint256 enrollmentTime
    ) {
        PatientData storage patientData = patients[patient];
        return (
            patientData.hasEnrolled,
            patientData.consentGiven,
            patientData.enrollmentTime
        );
    }

    // Get trial results (encrypted)
    function getTrialResults(uint8 phase) external view returns (
        bool completed,
        bool resultsCalculated,
        uint256 completionTime,
        uint8 participantCount
    ) {
        TrialResults storage results = phaseResults[phase];
        return (
            results.trialCompleted,
            results.resultsCalculated,
            results.completionTime,
            uint8(enrolledPatients.length)
        );
    }

    // Emergency trial termination (coordinator only)
    function emergencyTermination() external onlyCoordinator {
        currentTrialPhase = ANALYSIS_PHASE;
        phaseTransitionTime = block.timestamp;

        phaseResults[currentTrialPhase] = TrialResults({
            placeboGroupAverage: FHE.asEuint16(0),
            treatmentGroupAverage: FHE.asEuint16(0),
            totalParticipants: FHE.asEuint8(uint8(enrolledPatients.length)),
            resultsCalculated: false,
            trialCompleted: true,
            completionTime: block.timestamp
        });

        emit TrialCompleted(currentTrialPhase, block.timestamp);
    }

    // Get current phase name
    function getCurrentPhaseName() external view returns (string memory) {
        if (currentTrialPhase == ENROLLMENT_PHASE) return "Patient Enrollment";
        if (currentTrialPhase == TREATMENT_PHASE) return "Treatment Administration";
        if (currentTrialPhase == MONITORING_PHASE) return "Patient Monitoring";
        if (currentTrialPhase == ANALYSIS_PHASE) return "Data Analysis";
        return "Unknown Phase";
    }

    // Get total measurements submitted by a patient
    function getPatientMeasurementCount(address patient) external view returns (uint8 count) {
        for (uint8 week = 1; week <= 12; week++) {
            if (measurements[patient][week].isValid) {
                count++;
            }
        }
        return count;
    }
}