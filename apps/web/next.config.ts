import type { NextConfig } from "next";
import { loadRootEnv } from "./src/config/env";

loadRootEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@zalo/core"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
