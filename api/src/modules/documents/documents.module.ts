import { Module } from "@nestjs/common";
import { TotpService } from "src/modules/auth/totp.service";
import { DocumentsController } from "src/modules/documents/documents.controller";
import { DocumentsService } from "src/modules/documents/documents.service";

@Module({
    controllers: [DocumentsController],
    providers: [DocumentsService, TotpService],
    exports: [DocumentsService],
})
export class DocumentsModule {}
