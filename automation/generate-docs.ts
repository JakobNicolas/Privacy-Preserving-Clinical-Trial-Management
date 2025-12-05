import * as fs from "fs";
import * as path from "path";

/**
 * @title Documentation Generator
 * @notice Generates GitBook-compatible documentation from code annotations
 *
 * @chapter: automation
 * @category: documentation
 *
 * This script fulfills the Zama Bounty requirement for automated documentation generation.
 * It extracts JSDoc/NatSpec comments from contracts and test files to create comprehensive docs.
 *
 * Features:
 * - Parses @chapter and @category tags for organization
 * - Extracts function documentation from NatSpec comments
 * - Generates GitBook-compatible markdown
 * - Creates chapter-based navigation structure
 *
 * Usage:
 * ts-node automation/generate-docs.ts
 */

interface DocSection {
  title: string;
  content: string;
  chapter: string;
  category: string;
  file: string;
}

/**
 * Extract documentation from Solidity contract
 */
function extractSolidityDocs(filePath: string): DocSection[] {
  const content = fs.readFileSync(filePath, "utf8");
  const sections: DocSection[] = [];

  // Extract contract-level documentation
  const contractDocMatch = content.match(/\/\*\*([\s\S]*?)\*\/\s*contract/);
  if (contractDocMatch) {
    const doc = contractDocMatch[1];
    const title = extractTag(doc, "@title") || "Contract";
    const chapter = extractTag(doc, "@chapter") || "general";
    const category = extractTag(doc, "@category") || "examples";
    const description = extractDescription(doc);

    sections.push({
      title,
      content: description,
      chapter,
      category,
      file: path.basename(filePath),
    });
  }

  // Extract function documentation
  const functionDocs = content.matchAll(/\/\*\*([\s\S]*?)\*\/\s*function\s+(\w+)/g);
  for (const match of functionDocs) {
    const doc = match[1];
    const functionName = match[2];
    const notice = extractTag(doc, "@notice") || "";
    const dev = extractTag(doc, "@dev") || "";
    const params = extractParams(doc);

    if (notice || dev) {
      sections.push({
        title: `Function: ${functionName}`,
        content: `### ${functionName}()\n\n${notice}\n\n${dev}\n\n${params}`,
        chapter: "functions",
        category: "reference",
        file: path.basename(filePath),
      });
    }
  }

  return sections;
}

/**
 * Extract documentation from TypeScript test files
 */
function extractTestDocs(filePath: string): DocSection[] {
  const content = fs.readFileSync(filePath, "utf8");
  const sections: DocSection[] = [];

  // Extract describe block documentation
  const describeBlocks = content.matchAll(/\/\*\*([\s\S]*?)\*\/\s*describe\("([^"]+)"/g);
  for (const match of describeBlocks) {
    const doc = match[1];
    const title = match[2];
    const notice = extractTag(doc, "@notice") || "";
    const chapter = extractTag(doc, "@chapter") || "testing";
    const category = extractTag(doc, "@category") || "tests";

    if (notice) {
      sections.push({
        title: `Test Suite: ${title}`,
        content: notice,
        chapter,
        category,
        file: path.basename(filePath),
      });
    }
  }

  return sections;
}

/**
 * Extract tag value from documentation comment
 */
function extractTag(doc: string, tag: string): string | null {
  const regex = new RegExp(`${tag}\\s+([^\\n@]+)`);
  const match = doc.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract description from documentation comment
 */
function extractDescription(doc: string): string {
  const lines = doc.split("\n");
  const description: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim().replace(/^\*\s?/, "");
    if (trimmed && !trimmed.startsWith("@")) {
      description.push(trimmed);
    }
  }

  return description.join("\n");
}

/**
 * Extract parameter documentation
 */
function extractParams(doc: string): string {
  const params: string[] = [];
  const paramRegex = /@param\s+(\w+)\s+([^\n]+)/g;
  let match;

  while ((match = paramRegex.exec(doc)) !== null) {
    params.push(`- **${match[1]}**: ${match[2]}`);
  }

  return params.length > 0 ? `**Parameters:**\n${params.join("\n")}` : "";
}

/**
 * Generate markdown documentation
 */
function generateMarkdown(sections: DocSection[], chapter: string): string {
  const chapterSections = sections.filter((s) => s.chapter === chapter);

  if (chapterSections.length === 0) {
    return "";
  }

  let markdown = `# ${chapter.charAt(0).toUpperCase() + chapter.slice(1)}\n\n`;

  // Group by category
  const categories = new Set(chapterSections.map((s) => s.category));

  for (const category of categories) {
    const categorySections = chapterSections.filter((s) => s.category === category);

    markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

    for (const section of categorySections) {
      markdown += `### ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;
      markdown += `_Source: ${section.file}_\n\n`;
      markdown += "---\n\n";
    }
  }

  return markdown;
}

/**
 * Generate GitBook summary
 */
function generateSummary(chapters: string[]): string {
  let summary = "# Summary\n\n";
  summary += "* [Introduction](README.md)\n\n";

  for (const chapter of chapters) {
    const chapterName = chapter.charAt(0).toUpperCase() + chapter.slice(1);
    summary += `* [${chapterName}](${chapter}.md)\n`;
  }

  return summary;
}

/**
 * Main execution
 */
async function main() {
  console.log("=".repeat(60));
  console.log("FHEVM Documentation Generator");
  console.log("Zama Bounty Track - December 2025");
  console.log("=".repeat(60));

  const projectRoot = path.join(__dirname, "..");
  const docsDir = path.join(projectRoot, "docs");
  const contractsDir = path.join(projectRoot, "contracts");
  const testsDir = path.join(projectRoot, "test");

  console.log("\n📁 Project Root:", projectRoot);
  console.log("📁 Docs Output:", docsDir);

  // Ensure docs directory exists
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  console.log("\n📖 Extracting documentation...");

  // Collect all documentation sections
  const allSections: DocSection[] = [];

  // Process Solidity contracts
  if (fs.existsSync(contractsDir)) {
    const contractFiles = fs.readdirSync(contractsDir).filter((f) => f.endsWith(".sol"));

    for (const file of contractFiles) {
      console.log(`   Processing ${file}...`);
      const sections = extractSolidityDocs(path.join(contractsDir, file));
      allSections.push(...sections);
    }
  }

  // Process test files
  if (fs.existsSync(testsDir)) {
    const testFiles = fs.readdirSync(testsDir).filter((f) => f.endsWith(".ts"));

    for (const file of testFiles) {
      console.log(`   Processing ${file}...`);
      const sections = extractTestDocs(path.join(testsDir, file));
      allSections.push(...sections);
    }
  }

  console.log(`\n✓ Extracted ${allSections.length} documentation sections`);

  // Generate chapter-based documentation
  const chapters = [...new Set(allSections.map((s) => s.chapter))];

  console.log("\n📝 Generating markdown files...");

  for (const chapter of chapters) {
    const markdown = generateMarkdown(allSections, chapter);
    if (markdown) {
      const outputPath = path.join(docsDir, `${chapter}.md`);
      fs.writeFileSync(outputPath, markdown);
      console.log(`   ✓ Created ${chapter}.md`);
    }
  }

  // Generate GitBook summary
  const summary = generateSummary(chapters);
  fs.writeFileSync(path.join(docsDir, "SUMMARY.md"), summary);
  console.log("   ✓ Created SUMMARY.md");

  // Generate API reference
  console.log("\n📚 Generating API reference...");

  const apiContent = `# API Reference

## Contract Overview

This section provides detailed API documentation for all contracts and functions.

${chapters.map((c) => `- [${c}](${c}.md)`).join("\n")}

## Quick Links

- [Functions Reference](functions.md)
- [Testing Guide](testing.md)
- [Deployment Guide](../README.md#deployment)

`;

  fs.writeFileSync(path.join(docsDir, "API.md"), apiContent);
  console.log("   ✓ Created API.md");

  console.log("\n" + "=".repeat(60));
  console.log("✅ Documentation generated successfully!");
  console.log("=".repeat(60));
  console.log(`\nOutput directory: ${docsDir}`);
  console.log(`Chapters generated: ${chapters.length}`);
  console.log(`Total sections: ${allSections.length}`);
  console.log("\nGenerated files:");
  console.log("   - SUMMARY.md (GitBook navigation)");
  console.log("   - API.md (API reference)");
  chapters.forEach((c) => console.log(`   - ${c}.md`));
  console.log("\n" + "=".repeat(60));
}

// Execute
main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
