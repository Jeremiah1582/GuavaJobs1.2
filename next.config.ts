import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdfjs-dist",
    "better-sqlite3",
    "@prisma/client",
    "@prisma/adapter-better-sqlite3",
  ],
  reactCompiler: true,

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
