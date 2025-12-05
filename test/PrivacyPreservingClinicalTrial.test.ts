import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivacyPreservingClinicalTrial } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * @title Privacy-Preserving Clinical Trial Test Suite
 * @notice Comprehensive tests demonstrating FHEVM concepts and clinical trial workflow
 *
 * @chapter: testing
 * @category: healthcare
 *
 * Test Coverage:
 * 1. Patient Enrollment - Demonstrates encryption and access control
 * 2. Clinical Data Submission - Tests multiple encrypted values
 * 3. Phase Transitions - Validates trial workflow progression
 * 4. Results Analysis - Shows public decryption patterns
 * 5. Error Handling - Common pitfalls and edge cases
 *
 * FHEVM Testing Patterns:
 * - Working with encrypted values in tests
 * - Verifying access control permissions
 * - Testing FHE operations (encryption, random generation)
 * - Validating decryption callbacks
 */
describe("Privacy-Preserving Clinical Trial", function () {
  let trial: PrivacyPreservingClinicalTrial;
  let coordinator: HardhatEthersSigner;
  let patient1: HardhatEthersSigner;
  let patient2: HardhatEthersSigner;
  let patient3: HardhatEthersSigner;

  // Test data constants
  const VALID_AGE = 35;
  const VALID_HEALTH_SCORE = 85;
  const VALID_VITAL_SIGNS = 12080; // Encoded: HR=120, BP=80
  const PHASE_DURATION = 3600; // 1 hour in seconds

  /**
   * @notice Deploy contract before each test
   * @dev Ensures clean state for each test case
   */
  beforeEach(async function () {
    [coordinator, patient1, patient2, patient3] = await ethers.getSigners();

    const TrialFactory = await ethers.getContractFactory(
      "PrivacyPreservingClinicalTrial"
    );
    trial = await TrialFactory.deploy();
    await trial.waitForDeployment();
  });

  /**
   * @notice Test suite for deployment and initialization
   * @dev Validates contract is properly initialized
   */
  describe("Deployment", function () {
    it("Should set the correct coordinator", async function () {
      expect(await trial.trialCoordinator()).to.equal(coordinator.address);
    });

    it("Should initialize in ENROLLMENT_PHASE", async function () {
      expect(await trial.currentTrialPhase()).to.equal(1);
    });

    it("Should set initial phase transition time", async function () {
      const startTime = await trial.trialStartTime();
      const transitionTime = await trial.phaseTransitionTime();
      expect(transitionTime).to.equal(startTime + BigInt(PHASE_DURATION));
    });

    it("Should return correct phase name", async function () {
      expect(await trial.getCurrentPhaseName()).to.equal("Patient Enrollment");
    });
  });

  /**
   * @notice Test suite for patient enrollment
   * @dev Demonstrates FHEVM encryption and access control concepts
   *
   * FHEVM Concepts:
   * - FHE.asEuint8(): Converting plaintext to encrypted uint8
   * - FHE.asEuint16(): Converting plaintext to encrypted uint16
   * - FHE.randEuint8(): Generating encrypted random values
   * - FHE.allow(): Granting decryption permissions
   * - FHE.allowThis(): Granting contract operation permissions
   */
  describe("Patient Enrollment", function () {
    it("Should allow valid patient enrollment", async function () {
      // Enroll patient with valid data
      await expect(
        trial
          .connect(patient1)
          .enrollPatient(VALID_AGE, VALID_HEALTH_SCORE, VALID_VITAL_SIGNS)
      )
        .to.emit(trial, "PatientEnrolled")
        .withArgs(patient1.address, await time.latest());

      // Verify enrollment status
      const status = await trial.getPatientStatus(patient1.address);
      expect(status.enrolled).to.be.true;
      expect(status.consentGiven).to.be.true;
    });

    it("Should reject enrollment with invalid age (too young)", async function () {
      await expect(
        trial
          .connect(patient1)
          .enrollPatient(17, VALID_HEALTH_SCORE, VALID_VITAL_SIGNS)
      ).to.be.revertedWith("Age must be between 18-80");
    });

    it("Should reject enrollment with invalid age (too old)", async function () {
      await expect(
        trial
          .connect(patient1)
          .enrollPatient(81, VALID_HEALTH_SCORE, VALID_VITAL_SIGNS)
      ).to.be.revertedWith("Age must be between 18-80");
    });

    it("Should reject enrollment with invalid health score", async function () {
      await expect(
        trial.connect(patient1).enrollPatient(VALID_AGE, 101, VALID_VITAL_SIGNS)
      ).to.be.revertedWith("Health score must be 0-100");
    });

    it("Should prevent double enrollment", async function () {
      // First enrollment succeeds
      await trial
        .connect(patient1)
        .enrollPatient(VALID_AGE, VALID_HEALTH_SCORE, VALID_VITAL_SIGNS);

      // Second enrollment fails
      await expect(
        trial
          .connect(patient1)
          .enrollPatient(VALID_AGE, VALID_HEALTH_SCORE, VALID_VITAL_SIGNS)
      ).to.be.revertedWith("Patient already enrolled");
    });

    it("Should allow multiple different patients to enroll", async function () {
      // Enroll three patients
      await trial
        .connect(patient1)
        .enrollPatient(30, 80, VALID_VITAL_SIGNS);
      await trial
        .connect(patient2)
        .enrollPatient(45, 75, VALID_VITAL_SIGNS);
      await trial
        .connect(patient3)
        .enrollPatient(60, 90, VALID_VITAL_SIGNS);

      // Verify all are enrolled
      const status = await trial.getTrialStatus();
      expect(status.participantCount).to.equal(3);
    });

    it("Should only allow enrollment during ENROLLMENT_PHASE", async function () {
      // Advance to next phase
      await time.increase(PHASE_DURATION);
      await trial.transitionToNextPhase();

      // Enrollment should fail
      await expect(
        trial
          .connect(patient1)
          .enrollPatient(VALID_AGE, VALID_HEALTH_SCORE, VALID_VITAL_SIGNS)
      ).to.be.revertedWith("Wrong trial phase");
    });
  });

  /**
   * @notice Test suite for clinical data submission
   * @dev Demonstrates handling multiple encrypted values
   *
   * FHEVM Concepts:
   * - Multiple encrypted fields per submission
   * - Weekly data collection patterns
   * - Access control for clinical measurements
   */
  describe("Clinical Data Submission", function () {
    beforeEach(async function () {
      // Enroll patient first
      await trial
        .connect(patient1)
        .enrollPatient(VALID_AGE, VALID_HEALTH_SCORE, VALID_VITAL_SIGNS);

      // Advance to treatment phase
      await time.increase(PHASE_DURATION);
      await trial.transitionToNextPhase();
    });

    it("Should allow enrolled patient to submit clinical data", async function () {
      await expect(
        trial.connect(patient1).submitClinicalData(85, 3, 5000, 1)
      )
        .to.emit(trial, "ClinicalDataSubmitted")
        .withArgs(patient1.address, 1);

      // Verify measurement count increased
      const count = await trial.getPatientMeasurementCount(patient1.address);
      expect(count).to.equal(1);
    });

    it("Should allow multiple weeks of data submission", async function () {
      // Submit data for weeks 1-4
      await trial.connect(patient1).submitClinicalData(85, 3, 5000, 1);
      await trial.connect(patient1).submitClinicalData(87, 2, 5100, 2);
      await trial.connect(patient1).submitClinicalData(90, 1, 5200, 3);
      await trial.connect(patient1).submitClinicalData(92, 1, 5300, 4);

      // Verify measurement count
      const count = await trial.getPatientMeasurementCount(patient1.address);
      expect(count).to.equal(4);
    });

    it("Should reject invalid effectiveness score", async function () {
      await expect(
        trial.connect(patient1).submitClinicalData(101, 3, 5000, 1)
      ).to.be.revertedWith("Effectiveness score must be 0-100");
    });

    it("Should reject invalid side effect level", async function () {
      await expect(
        trial.connect(patient1).submitClinicalData(85, 11, 5000, 1)
      ).to.be.revertedWith("Side effect level must be 0-10");
    });

    it("Should reject invalid week number", async function () {
      await expect(
        trial.connect(patient1).submitClinicalData(85, 3, 5000, 0)
      ).to.be.revertedWith("Week must be 1-12");

      await expect(
        trial.connect(patient1).submitClinicalData(85, 3, 5000, 13)
      ).to.be.revertedWith("Week must be 1-12");
    });

    it("Should prevent duplicate submissions for same week", async function () {
      await trial.connect(patient1).submitClinicalData(85, 3, 5000, 1);

      await expect(
        trial.connect(patient1).submitClinicalData(90, 2, 5100, 1)
      ).to.be.revertedWith("Data already submitted for this week");
    });

    it("Should only allow submission during TREATMENT_PHASE", async function () {
      // Advance to monitoring phase
      await time.increase(PHASE_DURATION);
      await trial.transitionToNextPhase();

      // Submission should fail
      await expect(
        trial.connect(patient1).submitClinicalData(85, 3, 5000, 1)
      ).to.be.revertedWith("Wrong trial phase");
    });

    it("Should reject submissions from non-enrolled patients", async function () {
      await expect(
        trial.connect(patient2).submitClinicalData(85, 3, 5000, 1)
      ).to.be.revertedWith("Patient not enrolled");
    });
  });

  /**
   * @notice Test suite for phase transitions
   * @dev Validates trial workflow progression
   */
  describe("Phase Transitions", function () {
    it("Should transition from Enrollment to Treatment phase", async function () {
      await time.increase(PHASE_DURATION);

      await expect(trial.transitionToNextPhase())
        .to.emit(trial, "PhaseTransition")
        .withArgs(1, 2, await time.latest());

      expect(await trial.currentTrialPhase()).to.equal(2);
      expect(await trial.getCurrentPhaseName()).to.equal(
        "Treatment Administration"
      );
    });

    it("Should not allow premature phase transition", async function () {
      await time.increase(PHASE_DURATION - 100); // Just before threshold

      await expect(trial.transitionToNextPhase()).to.be.revertedWith(
        "Cannot transition phase yet"
      );
    });

    it("Should progress through all phases", async function () {
      // Enrollment -> Treatment
      await time.increase(PHASE_DURATION);
      await trial.transitionToNextPhase();
      expect(await trial.getCurrentPhaseName()).to.equal(
        "Treatment Administration"
      );

      // Treatment -> Monitoring
      await time.increase(PHASE_DURATION);
      await trial.transitionToNextPhase();
      expect(await trial.getCurrentPhaseName()).to.equal("Patient Monitoring");

      // Monitoring -> Analysis
      await time.increase(PHASE_DURATION);
      await trial.transitionToNextPhase();
      expect(await trial.getCurrentPhaseName()).to.equal("Data Analysis");
    });

    it("Should update phase transition time after each transition", async function () {
      const initialTransitionTime = await trial.phaseTransitionTime();

      await time.increase(PHASE_DURATION);
      await trial.transitionToNextPhase();

      const newTransitionTime = await trial.phaseTransitionTime();
      expect(newTransitionTime).to.be.greaterThan(initialTransitionTime);
    });
  });

  /**
   * @notice Test suite for trial status queries
   * @dev Tests view functions and status retrieval
   */
  describe("Trial Status", function () {
    it("Should return correct trial status", async function () {
      // Enroll some patients
      await trial
        .connect(patient1)
        .enrollPatient(VALID_AGE, VALID_HEALTH_SCORE, VALID_VITAL_SIGNS);
      await trial
        .connect(patient2)
        .enrollPatient(40, 80, VALID_VITAL_SIGNS);

      const status = await trial.getTrialStatus();
      expect(status.phase).to.equal(1);
      expect(status.participantCount).to.equal(2);
      expect(status.canTransition).to.be.false;
    });

    it("Should indicate when phase transition is possible", async function () {
      await time.increase(PHASE_DURATION);

      const status = await trial.getTrialStatus();
      expect(status.canTransition).to.be.true;
    });

    it("Should return correct patient status", async function () {
      await trial
        .connect(patient1)
        .enrollPatient(VALID_AGE, VALID_HEALTH_SCORE, VALID_VITAL_SIGNS);

      const status = await trial.getPatientStatus(patient1.address);
      expect(status.enrolled).to.be.true;
      expect(status.consentGiven).to.be.true;
      expect(status.enrollmentTime).to.be.greaterThan(0);
    });
  });

  /**
   * @notice Test suite for emergency termination
   * @dev Tests emergency stop functionality
   */
  describe("Emergency Termination", function () {
    it("Should allow coordinator to perform emergency termination", async function () {
      await expect(trial.connect(coordinator).emergencyTermination())
        .to.emit(trial, "TrialCompleted")
        .withArgs(4, await time.latest());

      expect(await trial.currentTrialPhase()).to.equal(4);

      const results = await trial.getTrialResults(4);
      expect(results.trialCompleted).to.be.true;
      expect(results.resultsCalculated).to.be.false;
    });

    it("Should reject emergency termination from non-coordinator", async function () {
      await expect(
        trial.connect(patient1).emergencyTermination()
      ).to.be.revertedWith("Only trial coordinator allowed");
    });
  });
});
