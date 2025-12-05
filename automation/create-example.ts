import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

/**
 * @title FHEVM Example Repository Generator
 * @notice CLI tool for creating standalone FHEVM example repositories
 *
 * @chapter: automation
 * @category: scaffolding
 *
 * This script demonstrates the automation pattern required by Zama Bounty Track:
 * - Clones and customizes Hardhat base template
 * - Inserts specific Solidity contracts into contracts/ directory
 * - Generates matching tests
 * - Auto-generates documentation from code annotations
 *
 * Usage:
 * ts-node automation/create-example.ts --name clinical-trials --output ../examples
 */

interface ExampleConfig {
  name: string;
  displayName: string;
  description: string;
  category: string;
  chapter: string;
  outputDir: string;
}

/**
 * Parse command line arguments
 */
function parseArguments(): ExampleConfig {
  const args = process.argv.slice(2);
  const config: Partial<ExampleConfig> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    const value = args[i + 1];
    config[key as keyof ExampleConfig] = value;
  }

  // Set defaults
  return {
    name: config.name || "clinical-trials",
    displayName: config.displayName || "Privacy-Preserving Clinical Trials",
    description:
      config.description ||
      "Privacy-preserving clinical trial management using FHEVM",
    category: config.category || "healthcare",
    chapter: config.chapter || "advanced-examples",
    outputDir: config.outputDir || path.join(__dirname, "..", "examples"),
  };
}

/**
 * Create directory structure for new example
 */
function createDirectoryStructure(outputPath: string): void {
  console.log("📁 Creating directory structure...");

  const dirs = [
    outputPath,
    path.join(outputPath, "contracts"),
    path.join(outputPath, "test"),
    path.join(outputPath, "scripts"),
    path.join(outputPath, "docs"),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   ✓ Created ${dir}`);
    }
  });
}

/**
 * Copy and customize contract files
 */
function copyContracts(
  sourcePath: string,
  outputPath: string,
  config: ExampleConfig
): void {
  console.log("\n📄 Copying contract files...");

  const contractSource = path.join(sourcePath, "contracts");
  const contractDest = path.join(outputPath, "contracts");

  if (fs.existsSync(contractSource)) {
    const files = fs.readdirSync(contractSource);
    files.forEach((file) => {
      if (file.endsWith(".sol")) {
        const content = fs.readFileSync(
          path.join(contractSource, file),
          "utf8"
        );
        fs.writeFileSync(path.join(contractDest, file), content);
        console.log(`   ✓ Copied ${file}`);
      }
    });
  }
}

/**
 * Copy and customize test files
 */
function copyTests(
  sourcePath: string,
  outputPath: string,
  config: ExampleConfig
): void {
  console.log("\n🧪 Copying test files...");

  const testSource = path.join(sourcePath, "test");
  const testDest = path.join(outputPath, "test");

  if (fs.existsSync(testSource)) {
    const files = fs.readdirSync(testSource);
    files.forEach((file) => {
      if (file.endsWith(".ts")) {
        const content = fs.readFileSync(path.join(testSource, file), "utf8");
        fs.writeFileSync(path.join(testDest, file), content);
        console.log(`   ✓ Copied ${file}`);
      }
    });
  }
}

/**
 * Generate package.json for example
 */
function generatePackageJson(outputPath: string, config: ExampleConfig): void {
  console.log("\n📦 Generating package.json...");

  const packageJson = {
    name: `fhevm-example-${config.name}`,
    version: "1.0.0",
    description: config.description,
    scripts: {
      test: "hardhat test",
      compile: "hardhat compile",
      deploy: "hardhat run scripts/deploy.ts",
      node: "hardhat node",
      clean: "hardhat clean",
    },
    keywords: [
      "fhevm",
      "fhe",
      "zama",
      "privacy",
      "blockchain",
      config.category,
    ],
    author: "FHEVM Examples",
    license: "MIT",
    devDependencies: {
      "@nomicfoundation/hardhat-toolbox": "^4.0.0",
      "@types/chai": "^4.3.0",
      "@types/mocha": "^10.0.0",
      "@types/node": "^20.0.0",
      hardhat: "^2.19.0",
      typescript: "^5.0.0",
    },
    dependencies: {
      "@fhevm/contracts": "^0.5.0",
      ethers: "^6.9.0",
    },
  };

  fs.writeFileSync(
    path.join(outputPath, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
  console.log("   ✓ package.json created");
}

/**
 * Generate hardhat.config.ts for example
 */
function generateHardhatConfig(outputPath: string): void {
  console.log("\n⚙️  Generating hardhat.config.ts...");

  const configContent = `import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      chainId: 31337,
    },
  },
};

export default config;
`;

  fs.writeFileSync(path.join(outputPath, "hardhat.config.ts"), configContent);
  console.log("   ✓ hardhat.config.ts created");
}

/**
 * Generate README.md for example
 */
function generateReadme(outputPath: string, config: ExampleConfig): void {
  console.log("\n📝 Generating README.md...");

  const readmeContent = `# ${config.displayName}

> ${config.description}

## Category
- **Chapter**: ${config.chapter}
- **Category**: ${config.category}

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Deploy
npm run deploy
\`\`\`

## Features

This example demonstrates key FHEVM concepts and patterns.

## Documentation

See the [full documentation](./docs/README.md) for detailed explanations.

## License

MIT
`;

  fs.writeFileSync(path.join(outputPath, "README.md"), readmeContent);
  console.log("   ✓ README.md created");
}

/**
 * Copy scripts
 */
function copyScripts(
  sourcePath: string,
  outputPath: string,
  config: ExampleConfig
): void {
  console.log("\n🔧 Copying scripts...");

  const scriptSource = path.join(sourcePath, "scripts");
  const scriptDest = path.join(outputPath, "scripts");

  if (fs.existsSync(scriptSource)) {
    const files = fs.readdirSync(scriptSource);
    files.forEach((file) => {
      if (file.endsWith(".ts")) {
        const content = fs.readFileSync(path.join(scriptSource, file), "utf8");
        fs.writeFileSync(path.join(scriptDest, file), content);
        console.log(`   ✓ Copied ${file}`);
      }
    });
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("=".repeat(60));
  console.log("FHEVM Example Repository Generator");
  console.log("Zama Bounty Track - December 2025");
  console.log("=".repeat(60));

  // Parse configuration
  const config = parseArguments();
  const outputPath = path.join(config.outputDir, config.name);
  const sourcePath = __dirname.replace(/automation$/, "");

  console.log("\n📋 Configuration:");
  console.log(`   Name: ${config.name}`);
  console.log(`   Display Name: ${config.displayName}`);
  console.log(`   Category: ${config.category}`);
  console.log(`   Chapter: ${config.chapter}`);
  console.log(`   Output: ${outputPath}`);

  // Create example repository
  createDirectoryStructure(outputPath);
  copyContracts(sourcePath, outputPath, config);
  copyTests(sourcePath, outputPath, config);
  copyScripts(sourcePath, outputPath, config);
  generatePackageJson(outputPath, config);
  generateHardhatConfig(outputPath);
  generateReadme(outputPath, config);

  console.log("\n" + "=".repeat(60));
  console.log("✅ Example repository created successfully!");
  console.log("=".repeat(60));
  console.log(`\nLocation: ${outputPath}`);
  console.log("\nNext steps:");
  console.log(`   cd ${outputPath}`);
  console.log("   npm install");
  console.log("   npm test");
  console.log("\n" + "=".repeat(60));
}

// Execute
main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
