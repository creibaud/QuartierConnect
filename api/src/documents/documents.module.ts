import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ContractDocumentsService } from "./contract-documents.service";
import { PdfService } from "./pdf.service";
import {
    ContractPdfDocument,
    ContractPdfDocumentSchema,
} from "./schemas/document.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: ContractPdfDocument.name,
                schema: ContractPdfDocumentSchema,
            },
        ]),
    ],
    providers: [PdfService, ContractDocumentsService],
    exports: [PdfService, ContractDocumentsService],
})
export class DocumentsModule {}
