export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.VERCEL === "1") {
    try {
      const { assertRequiredEnvForDeploy } = await import("./lib/env");
      assertRequiredEnvForDeploy();
    } catch (error) {
      console.error(
        "[env] Vercel ortam degiskeni eksik:",
        error instanceof Error ? error.message : error
      );
    }
  }
}
