import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env before any module decorators run.
// @Throttle reads LOGIN_RATE_LIMIT at class-definition time, before ConfigModule.forRoot()
// has a chance to populate process.env via dotenv.
function loadEnvFile(filePath: string): void {
    try {
        const content = readFileSync(filePath, "utf-8");
        for (const line of content.split("\n")) {
            const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
            if (match && process.env[match[1]] === undefined) {
                process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
            }
        }
    } catch {
        // File not found — skip silently
    }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), "../.env"));
