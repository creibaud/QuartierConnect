import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
    getHealth() {
        return {
            status: "ok",
            message: "Server is running",
            timestamp: new Date().toISOString(),
        };
    }
}
