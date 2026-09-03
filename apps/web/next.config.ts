import type { NextConfig } from "next";
const config: NextConfig = {
  transpilePackages: ["@agentes-meta/core"],
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  // El core importa con extensión .js (NodeNext) apuntando a .ts; webpack necesita el alias
  webpack: (cfg) => { cfg.resolve.extensionAlias = { ".js": [".ts", ".js"] }; return cfg; },
};
export default config;
