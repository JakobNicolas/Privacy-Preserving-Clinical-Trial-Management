# Privacy-Preserving Clinical Trial Management - Demo Video Script

**Duration**: 60 seconds
**Target Audience**: Zama Bounty Evaluators & FHEVM Developers
**Platform**: Competition Submission

---

## Scene 1: Opening & Problem Statement
**Duration**: 0:00 - 0:12 (12 seconds)

**Visual Elements**:
- Title card: "Privacy-Preserving Clinical Trial Management"
- Subtitle: "Built with Zama FHEVM"
- Transition to animated diagram showing traditional clinical trial privacy risks
- Highlight sensitive patient data, treatment assignments, and results

**Screen Actions**:
- Fade in project logo/title
- Show animated infographic of privacy concerns in clinical trials
- Display key problem points: data exposure, assignment bias, privacy regulations

---

## Scene 2: Solution Overview with FHEVM
**Duration**: 0:12 - 0:25 (13 seconds)

**Visual Elements**:
- Code editor showing the smart contract file
- Highlight key FHEVM concepts with annotations:
  - `FHE.asEuint8()` encryption
  - `FHE.randEuint8()` random treatment assignment
  - `FHE.allowThis()` access control
  - `FHE.requestDecryption()` public decryption

**Screen Actions**:
- Open `contracts/PrivacyPreservingClinicalTrial.sol`
- Scroll to `enrollPatient()` function (lines 204-252)
- Highlight encryption operations
- Show access control implementation
- Quick transition showing struct definitions with encrypted fields

---

## Scene 3: Live Test Demonstration
**Duration**: 0:25 - 0:42 (17 seconds)

**Visual Elements**:
- Terminal showing test execution
- Test output with green checkmarks
- Key test cases highlighted:
  - Patient enrollment with encrypted data
  - Clinical data submission across multiple weeks
  - Phase transitions
  - Access control validation

**Screen Actions**:
- Execute: `npm test`
- Show test results scrolling (speed up footage if needed)
- Highlight: "29 passing tests"
- Show coverage summary or key test names
- Display test execution time

---

## Scene 4: Architecture & Features Highlight
**Duration**: 0:42 - 0:52 (10 seconds)

**Visual Elements**:
- Split screen or quick transitions showing:
  - Project structure (file tree)
  - Four-phase workflow diagram (Enrollment → Treatment → Monitoring → Analysis)
  - Key features list with icons
  - Documentation preview

**Screen Actions**:
- Show project directory structure
- Display phase transition diagram
- Quick preview of README.md
- Show automation scripts in `/automation` directory

---

## Scene 5: Closing & Call to Action
**Duration**: 0:52 - 1:00 (8 seconds)

**Visual Elements**:
- Summary slide with key achievements:
  - ✅ Complete FHEVM implementation
  - ✅ 29+ comprehensive tests
  - ✅ Production-ready automation
  - ✅ Extensive documentation
- Zama Bounty Track logo
- GitHub repository link placeholder
- "Built for Zama Bounty Track December 2025"

**Screen Actions**:
- Display summary checklist with animated checkmarks
- Show Zama logo
- Fade to repository URL/QR code
- End card with project title

---

## Technical Requirements

### Recording Settings
- **Resolution**: 1920x1080 (Full HD minimum)
- **Frame Rate**: 30fps or 60fps
- **Format**: MP4 (H.264 codec)
- **Audio**: Clear narration with background music (optional)

### Screen Recording Tools
- OBS Studio (recommended for developers)
- Loom (for quick, professional recordings)
- Camtasia (for advanced editing)

### Code Display Settings
- **Font**: Fira Code, JetBrains Mono, or similar monospace
- **Font Size**: Large enough to read (minimum 16px)
- **Theme**: Dark theme recommended (e.g., GitHub Dark, One Dark Pro)
- **Zoom**: Ensure code is clearly readable

### Terminal Display
- **Font Size**: Large (14-16pt minimum)
- **Color Scheme**: High contrast
- **Command Visibility**: Each command should be clearly visible before execution

---

## Recording Tips

1. **Preparation**:
   - Clean workspace (close unnecessary applications)
   - Fresh terminal session
   - Code editor with clean state
   - Disable notifications

2. **Pacing**:
   - Allow 1-2 seconds for viewers to absorb each visual
   - Don't rush through code sections
   - Ensure smooth transitions

3. **Audio Quality**:
   - Use good microphone (USB mic recommended)
   - Record in quiet environment
   - Speak clearly and at moderate pace
   - Add subtle background music if desired

4. **Visual Clarity**:
   - Keep cursor movements smooth
   - Highlight important code sections
   - Use zoom/pan effects sparingly
   - Maintain consistent visual style

5. **Editing**:
   - Speed up long test execution (2x speed)
   - Add text overlays for key points
   - Include subtle transitions between scenes
   - Ensure final duration is 60 seconds ±3 seconds

---

## Post-Production Checklist

- [ ] Video duration is exactly 60 seconds (±3 seconds tolerance)
- [ ] All code is clearly readable
- [ ] Audio narration is clear and synchronized
- [ ] No sensitive information visible (API keys, private paths, etc.)
- [ ] Branding is consistent (Zama logo, project title)
- [ ] Transitions are smooth
- [ ] Final render is 1080p MP4
- [ ] File size is reasonable (<100MB recommended)
- [ ] Tested playback on multiple devices

---

## Alternative Scene Variations

### Option A: Technical Deep-Dive Focus
- More time on code walkthrough (35 seconds)
- Less time on overview (10 seconds)
- Suitable for technical audience

### Option B: Use Case Focus
- Start with healthcare scenario (15 seconds)
- Show solution (30 seconds)
- Quick technical demo (15 seconds)
- Suitable for broader audience

### Option C: Live Demo Focus
- Brief intro (8 seconds)
- Full workflow demonstration (45 seconds)
- Summary (7 seconds)
- Suitable for showcasing functionality

---

## Assets Required

### Visual Assets
- Project logo (if available)
- Zama FHEVM logo
- Phase diagram illustration
- Privacy concept icons

### Code Snippets to Highlight
1. `enrollPatient()` function (line 204)
2. Encrypted struct definition (line 69)
3. Access control implementation (line 240)
4. Public decryption request (line 338)

### Terminal Commands
```bash
npm install
npm test
npm run deploy
```

---

## Final Deliverable

**Filename**: `ConfidentialDrugTrial_Demo.mp4`

**Location**: Root directory of project

**Metadata**:
- Title: "Privacy-Preserving Clinical Trial Management - FHEVM Implementation"
- Description: "Zama Bounty Track December 2025 submission demonstrating comprehensive clinical trial management using Fully Homomorphic Encryption"
- Tags: FHEVM, Zama, Healthcare, Privacy, Blockchain, Smart Contracts

---

**Script Version**: 1.0
**Last Updated**: December 2025
**Created for**: Zama Bounty Track December 2025
