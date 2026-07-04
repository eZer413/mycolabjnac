/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a fully static site into ./out that Capacitor can package into the
  // Android app. There is no server on the device — every page runs client-side
  // against the on-device database. (`next dev` is unaffected; this only changes
  // `next build`.)
  output: "export",
  // Static export can't use the Next.js image optimizer (it needs a server).
  images: { unoptimized: true },
};

export default nextConfig;
