import type { NextConfig } from "next";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

// Get version from package.json at build time
function getVersion() {
  try {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf-8")
    );
    return packageJson.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

// Get git info at build time
function getGitInfo() {
  try {
    const commitHash = execSync("git rev-parse --short HEAD").toString().trim();
    const commitDate = execSync("git log -1 --format=%ci").toString().trim();
    return { commitHash, commitDate };
  } catch {
    return { commitHash: "unknown", commitDate: new Date().toISOString() };
  }
}

const gitInfo = getGitInfo();
const version = getVersion();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_BUILD_ID: gitInfo.commitHash,
    NEXT_PUBLIC_BUILD_DATE: gitInfo.commitDate,
  },
};

export default nextConfig;
