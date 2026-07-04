import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Reverse-domain app id — the unique package name Android uses for the app.
  appId: "com.mycolab.app",
  appName: "MycoLab",
  // The static export Next.js produces (see next.config.mjs `output: "export"`).
  // `npx cap sync` copies this folder into the native project.
  webDir: "out",
};

export default config;
