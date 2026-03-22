import { LoggerService } from "@nestjs/common";

export class JsonLogger implements LoggerService {
    private write(level: string, message: unknown, context?: string) {
        process.stdout.write(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                level,
                context,
                message,
            }) + "\n",
        );
    }

    log(message: unknown, context?: string) {
        this.write("info", message, context);
    }

    error(message: unknown, trace?: string, context?: string) {
        this.write("error", { message, trace }, context);
    }

    warn(message: unknown, context?: string) {
        this.write("warn", message, context);
    }

    debug(message: unknown, context?: string) {
        this.write("debug", message, context);
    }

    verbose(message: unknown, context?: string) {
        this.write("verbose", message, context);
    }
}
