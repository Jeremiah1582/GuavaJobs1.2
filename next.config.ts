import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["pdf-parse", "pdfjs-dist","better-sqlite3","drizzle-orm/better-sqlite3"],
  reactCompiler: true,
};

export default nextConfig;
