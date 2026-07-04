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

const ALLOWED_AVATAR_MIME_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp",
] as const;

type AllowedAvatarMimeType = (typeof ALLOWED_AVATAR_MIME_TYPES)[number];

function isAllowedAvatarMimeType(
    mimetype: string,
): mimetype is AllowedAvatarMimeType {
    return (ALLOWED_AVATAR_MIME_TYPES as readonly string[]).includes(mimetype);
}

// Verify the declared MIME type against the file's magic bytes so a hostile
// payload (e.g. an SVG carrying script) cannot masquerade as a raster image.
function hasMatchingImageMagicBytes(
    buffer: Buffer,
    mimetype: AllowedAvatarMimeType,
): boolean {
    switch (mimetype) {
        case "image/png":
            return (
                buffer.length >= 4 &&
                buffer[0] === 0x89 &&
                buffer[1] === 0x50 &&
                buffer[2] === 0x4e &&
                buffer[3] === 0x47
            );
        case "image/jpeg":
            return (
                buffer.length >= 3 &&
                buffer[0] === 0xff &&
                buffer[1] === 0xd8 &&
                buffer[2] === 0xff
            );
        case "image/webp":
            return (
                buffer.length >= 12 &&
                buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
                buffer.subarray(8, 12).toString("ascii") === "WEBP"
            );
    }
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
        if (
            !isAllowedAvatarMimeType(file.mimetype) ||
            !hasMatchingImageMagicBytes(file.buffer, file.mimetype)
        ) {
            throw new BadRequestException(
                "Avatar must be a PNG, JPEG or WebP image",
            );
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

        // Never trust the stored content type for untrusted data: only emit a
        // safe raster type, and force download so no active content can render.
        const storedType = file.metadata?.contentType as string | undefined;
        const contentType =
            storedType && isAllowedAvatarMimeType(storedType)
                ? storedType
                : "image/jpeg";
        res.set({
            "Content-Type": contentType,
            "Content-Disposition": "attachment",
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
