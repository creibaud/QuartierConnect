import { Module } from "@nestjs/common";
import { Neo4jModule } from "./neo4j/neo4j.module";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";

@Module({
    imports: [Neo4jModule],
    controllers: [SocialController],
    providers: [SocialService],
    exports: [SocialService],
})
export class SocialModule {}
