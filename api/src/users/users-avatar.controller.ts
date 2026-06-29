import {
    BadRequestException,
    Controller,
    Delete,
    Get,
    Inject,
    NotFoundException,
    Param,
    Post,
    Request,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { FileInterceptor } from "@nestjs/platform-express";
import {
    ApiBearerAuth,
    ApiConsumes,
    ApiOperation,
    ApiTags,
} from "@nestjs/swagger";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Response } from "express";
import { GridFSBucket, ObjectId } from "mongodb";
import { Connection } from "mongoose";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";

interface AuthRequest {
    user: { sub: string };
}

const PROFILE_COLUMNS = {
    id: schema.users.id,
    email: schema.users.email,
    role: schema.users.role,
    firstName: schema.users.firstName,
    lastName: schema.users.lastName,
    avatarUrl: schema.users.avatarUrl,
};

@ApiTags("Users (avatar)")
@Controller("users")
export class UsersAvatarController {
    private readonly bucket: GridFSBucket;

    constructor(
        @InjectConnection() connection: Connection,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) {
        this.bucket = new GridFSBucket(connection.db as never, {
            bucketName: "avatars",
        });
    }

    @Post("me/avatar")
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Upload my avatar (GridFS)" })
    @ApiConsumes("multipart/form-data")
    @UseInterceptors(
        FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }),
    )
    async upload(
        @Request() req: AuthRequest,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new BadRequestException("No file provided");
        if (!file.mimetype.startsWith("image/")) {
            throw new BadRequestException("File must be an image");
        }

        await this.deleteExisting(req.user.sub);

        const fileId = new ObjectId();
        await new Promise<void>((resolve) => {
            const stream = this.bucket.openUploadStreamWithId(
                fileId,
                `avatar-${req.user.sub}`,
                {
                    metadata: {
                        uploadedBy: req.user.sub,
                        contentType: file.mimetype,
                    },
                },
            );
            stream.end(file.buffer, () => resolve());
        });

        const [profile] = await this.db
            .update(schema.users)
            .set({
                avatarUrl: `/users/avatar/${fileId.toHexString()}`,
                updatedAt: new Date(),
            })
            .where(eq(schema.users.id, req.user.sub))
            .returning(PROFILE_COLUMNS);
        return profile;
    }

    @Delete("me/avatar")
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Remove my avatar" })
    async remove(@Request() req: AuthRequest) {
        await this.deleteExisting(req.user.sub);
        const [profile] = await this.db
            .update(schema.users)
            .set({ avatarUrl: null, updatedAt: new Date() })
            .where(eq(schema.users.id, req.user.sub))
            .returning(PROFILE_COLUMNS);
        return profile;
    }

    @Get("avatar/:fileId")
    @ApiOperation({ summary: "Serve an avatar image (public)" })
    async serve(@Param("fileId") fileId: string, @Res() res: Response) {
        if (!ObjectId.isValid(fileId)) {
            throw new BadRequestException("Invalid file id");
        }
        const objectId = new ObjectId(fileId);
        const [file] = await this.bucket.find({ _id: objectId }).toArray();
        if (!file) throw new NotFoundException("Avatar not found");

        res.set({
            "Content-Type":
                (file.metadata?.contentType as string | undefined) ??
                "image/jpeg",
            "Cache-Control": "public, max-age=86400",
        });
        this.bucket.openDownloadStream(objectId).pipe(res);
    }

    private async deleteExisting(userId: string): Promise<void> {
        const [user] = await this.db
            .select({ avatarUrl: schema.users.avatarUrl })
            .from(schema.users)
            .where(eq(schema.users.id, userId));
        const match = user?.avatarUrl?.match(
            /\/users\/avatar\/([a-f0-9]{24})/i,
        );
        if (match && ObjectId.isValid(match[1])) {
            await this.bucket
                .delete(new ObjectId(match[1]))
                .catch(() => undefined);
        }
    }
}
