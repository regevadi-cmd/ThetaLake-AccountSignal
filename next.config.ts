import type { NextConfig } from "next";
import { execSync } from "child_process";

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

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: gitInfo.commitHash,
    NEXT_PUBLIC_BUILD_DATE: gitInfo.commitDate,
  },
};

export default nextConfig;
