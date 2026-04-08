import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import {
    DocumentAudit,
    DocumentAuditSchema,
} from "./schemas/document-audit.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DocumentAudit.name, schema: DocumentAuditSchema },
        ]),
        AuthModule,
    ],
    controllers: [DocumentsController],
    providers: [DocumentsService],
})
export class DocumentsModule {}
