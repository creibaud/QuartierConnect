import { Module } from "@nestjs/common";
import { TotpService } from "src/modules/auth/totp.service";
import { DocumentsController } from "src/modules/documents/documents.controller";
import { DocumentsService } from "src/modules/documents/documents.service";
import { DocumentSignatureService } from "src/modules/documents/services";

@Module({
    controllers: [DocumentsController],
    providers: [
        {
            provide: DocumentSignatureService,
            useFactory: (mongo, totpService) =>
                new DocumentSignatureService(mongo, totpService),
            inject: ["MONGODB", TotpService],
        },
        DocumentsService,
        TotpService,
    ],
    exports: [DocumentsService, DocumentSignatureService],
})
export class DocumentsModule {}
