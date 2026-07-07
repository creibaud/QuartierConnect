import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env before decorators run: @Throttle reads env at class-definition time.
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
        // No .env file — skip
    }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), "../.env"));
