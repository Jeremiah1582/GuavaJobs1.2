import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/applications",
        destination: "/dashboard/applications",
        permanent: true,
      },
      {
        source: "/applications/:path*",
        destination: "/dashboard/applications/:path*",
        permanent: true,
      },
      {
        source: "/profile",
        destination: "/dashboard/profile",
        permanent: true,
      },
      {
        source: "/jobs",
        destination: "/dashboard/jobs",
        permanent: true,
      },
    ];
  },
  serverExternalPackages: ["pdfjs-dist", "@prisma/client", "@prisma/adapter-pg", "pg"],
  reactCompiler: true,

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
