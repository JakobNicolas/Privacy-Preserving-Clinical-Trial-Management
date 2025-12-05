// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint8, euint16, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialDrugTrial is SepoliaConfig {

    address public trialCoordinator;
    uint8 public currentTrialPhase;
    uint256 public trialStartTime;
    uint256 public phaseTransitionTime;

    // Trial phases: 1=Enrollment, 2=Treatment, 3=Monitoring, 4=Analysis
    uint8 constant ENROLLMENT_PHASE = 1;
    uint8 constant TREATMENT_PHASE = 2;
    uint8 constant MONITORING_PHASE = 3;
    uint8 constant ANALYSIS_PHASE = 4;

    // Phase duration in seconds (for demo: 1 hour each)
    uint256 constant PHASE_DURATION = 3600;

    struct PatientData {
        euint8 encryptedAge;
        euint8 encryptedHealthScore; // 0-100 health metric
        euint8 encryptedTreatmentGroup; // 0=placebo, 1=treatment
        euint16 encryptedVitalSigns; // Heart rate, blood pressure encoded
        bool hasEnrolled;
        bool consentGiven;
        uint256 enrollmentTime;
        address patientAddress;
    }

    struct TrialResults {
        euint16 placeboGroupAverage;
        euint16 treatmentGroupAverage;
        euint8 totalParticipants;
        bool resultsCalculated;
        bool trialCompleted;
        uint256 completionTime;
    }

    struct ClinicalMeasurement {
        euint8 encryptedEffectivenessScore; // 0-100
        euint8 encryptedSideEffectLevel; // 0-10
        euint16 encryptedBiomarkers; // Various biomarker levels
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

    // Check if it's time to transition to next phase
    function canTransitionPhase() public view returns (bool) {
        return block.timestamp >= phaseTransitionTime && currentTrialPhase < ANALYSIS_PHASE;
    }

    // Patient enrollment with encrypted personal data
    function enrollPatient(
        uint8 _age,
        uint8 _healthScore,
        uint16 _vitalSigns
    ) external onlyDuringPhase(ENROLLMENT_PHASE) {
        require(!patients[msg.sender].hasEnrolled, "Patient already enrolled");
        require(_age >= 18 && _age <= 80, "Age must be between 18-80");
        require(_healthScore <= 100, "Health score must be 0-100");

        // Encrypt patient data
        euint8 encryptedAge = FHE.asEuint8(_age);
        euint8 encryptedHealthScore = FHE.asEuint8(_healthScore);
        euint16 encryptedVitalSigns = FHE.asEuint16(_vitalSigns);

        // Randomly assign to treatment group (encrypted)
        euint8 treatmentGroup = FHE.randEuint8();
        // Use modulo 2 to get 0 or 1

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

        // Grant access permissions
        FHE.allowThis(encryptedAge);
        FHE.allowThis(encryptedHealthScore);
        FHE.allowThis(encryptedVitalSigns);
        FHE.allowThis(treatmentGroup);
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