import type { NextConfig } from "next";
import { loadRootEnv } from "./src/config/env";

loadRootEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@zalo/core"],
  serverExternalPackages: ["mysql2"],
};

export default nextConfig;
