import { Inject, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { eq, or } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Model } from "mongoose";
import { Driver } from "neo4j-driver";
import { User, UserDocument } from "../auth/schemas/user.schema";
import {
    ServiceBooking,
    ServiceBookingDocument,
} from "../bookings/schemas/service-booking.schema";
import {
    CommunityVote,
    CommunityVoteDocument,
} from "../community-votes/schemas/community-vote.schema";
import {
    Contract,
    ContractDocument,
} from "../contracts/schemas/contract.schema";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { Message, MessageDocument } from "../messaging/schemas/message.schema";
import { Service, ServiceDocument } from "../services/schemas/service.schema";
import { NEO4J_DRIVER } from "../social/neo4j/neo4j.provider";
import { Vote, VoteDocument } from "../votes/schemas/vote.schema";

interface MongoDocumentMeta {
    _id: unknown;
    createdAt?: Date;
}

@Injectable()
export class GdprExportService {
    constructor(
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
        @InjectModel(Message.name)
        private readonly messageModel: Model<MessageDocument>,
        @InjectModel(Contract.name)
        private readonly contractModel: Model<ContractDocument>,
        @InjectModel(ServiceBooking.name)
        private readonly bookingModel: Model<ServiceBookingDocument>,
        @InjectModel(Vote.name)
        private readonly voteModel: Model<VoteDocument>,
        @InjectModel(CommunityVote.name)
        private readonly communityVoteModel: Model<CommunityVoteDocument>,
        @InjectModel(Service.name)
        private readonly serviceModel: Model<ServiceDocument>,
        @Inject(NEO4J_DRIVER)
        private readonly neo4jDriver: Driver,
    ) {}

    async exportUserData(userId: string) {
        const [profile] = await this.db
            .select({
                id: schema.users.id,
                email: schema.users.email,
                role: schema.users.role,
                firstName: schema.users.firstName,
                lastName: schema.users.lastName,
                avatarUrl: schema.users.avatarUrl,
                phone: schema.users.phone,
                createdAt: schema.users.createdAt,
            })
            .from(schema.users)
            .where(eq(schema.users.id, userId));

        const incidents = await this.db
            .select()
            .from(schema.incidents)
            .where(eq(schema.incidents.createdBy, userId));

        const [pointsBalance] = await this.db
            .select()
            .from(schema.pointsBalances)
            .where(eq(schema.pointsBalances.userId, userId));

        // Both sent and received movements belong in the export.
        const transactions = await this.db
            .select()
            .from(schema.pointsTransactions)
            .where(
                or(
                    eq(schema.pointsTransactions.senderId, userId),
                    eq(schema.pointsTransactions.recipientId, userId),
                ),
            );

        return {
            profile: profile ?? null,
            consentTimestamp: await this.fetchConsentTimestamp(profile?.email),
            incidents,
            pointsBalance: pointsBalance ?? null,
            transactions,
            socialData: await this.fetchSocialData(userId),
            messagesSent: await this.fetchMessagesSent(userId),
            contracts: await this.fetchContracts(userId),
            bookings: await this.fetchBookings(userId),
            votes: await this.fetchVotes(userId),
            communityBallots: await this.fetchCommunityBallots(userId),
            services: await this.fetchServicesCreated(userId),
        };
    }

    private async fetchConsentTimestamp(
        email: string | undefined,
    ): Promise<Date | null> {
        if (!email) return null;
        const mongoUser = await this.userModel
            .findOne({ email })
            .select({ consentTimestamp: 1 })
            .exec();
        return mongoUser?.consentTimestamp ?? null;
    }

    private async fetchSocialData(
        userId: string,
    ): Promise<{ relationship: string; targetId: string }[]> {
        const neo4jSession = this.neo4jDriver.session();
        try {
            const neo4jResult = await neo4jSession.run(
                `MATCH (u:User {id: $userId})-[r]->(t)
         RETURN type(r) AS relationship, t.id AS targetId`,
                { userId },
            );
            return neo4jResult.records.map((rec) => ({
                relationship: rec.get("relationship") as string,
                targetId: rec.get("targetId") as string,
            }));
        } catch {
            // Neo4j unavailable — export continues without social data
            return [];
        } finally {
            await neo4jSession.close();
        }
    }

    private async fetchMessagesSent(userId: string) {
        const messages = await this.messageModel
            .find({ senderId: userId })
            .sort({ createdAt: 1 })
            .lean<(Message & MongoDocumentMeta)[]>()
            .exec();
        return messages.map((message) => ({
            id: String(message._id),
            conversationId: message.conversationId,
            type: message.type,
            content: message.deleted ? null : message.content,
            fileName: message.fileName,
            deleted: message.deleted,
            createdAt: message.createdAt ?? null,
        }));
    }

    private async fetchContracts(userId: string) {
        const contracts = await this.contractModel
            .find({
                $or: [{ createdBy: userId }, { signatories: userId }],
            })
            .lean<(Contract & MongoDocumentMeta)[]>()
            .exec();
        return contracts.map((contract) => ({
            id: String(contract._id),
            title: contract.title,
            status: contract.status,
            createdBy: contract.createdBy,
            signatories: contract.signatories,
            signedAt: contract.signedAt ?? null,
            signatures: contract.signatures.map((signature) => ({
                userId: signature.userId,
                signedAt: signature.signedAt,
            })),
            createdAt: contract.createdAt ?? null,
        }));
    }

    private async fetchBookings(userId: string) {
        const bookings = await this.bookingModel
            .find({
                $or: [
                    { initiatorId: userId },
                    { payerId: userId },
                    { payeeId: userId },
                ],
            })
            .lean<(ServiceBooking & MongoDocumentMeta)[]>()
            .exec();
        return bookings.map((booking) => ({
            id: String(booking._id),
            serviceId: String(booking.serviceId),
            initiatorId: booking.initiatorId,
            payerId: booking.payerId,
            payeeId: booking.payeeId,
            pointsAmount: booking.pointsAmount,
            status: booking.status,
            contractId: booking.contractId,
            createdAt: booking.createdAt ?? null,
        }));
    }

    private async fetchVotes(userId: string) {
        const votes = await this.voteModel
            .find({ userId })
            .lean<(Vote & MongoDocumentMeta)[]>()
            .exec();
        return votes.map((vote) => ({
            id: String(vote._id),
            targetId: vote.targetId,
            targetType: vote.targetType,
            voteType: vote.voteType,
            createdAt: vote.createdAt ?? null,
        }));
    }

    private async fetchCommunityBallots(userId: string) {
        const communityVotes = await this.communityVoteModel
            .find({ "casts.userId": userId })
            .select({ title: 1, status: 1, casts: 1 })
            .lean<(CommunityVote & MongoDocumentMeta)[]>()
            .exec();
        return communityVotes.map((communityVote) => {
            const ownCast = communityVote.casts.find(
                (cast) => cast.userId === userId,
            );
            return {
                id: String(communityVote._id),
                title: communityVote.title,
                status: communityVote.status,
                choices: ownCast?.choices ?? [],
                castAt: ownCast?.castAt ?? null,
            };
        });
    }

    private async fetchServicesCreated(userId: string) {
        const services = await this.serviceModel
            .find({ createdBy: userId })
            .lean<(Service & MongoDocumentMeta)[]>()
            .exec();
        return services.map((service) => ({
            id: String(service._id),
            title: service.title,
            category: service.category,
            type: service.type,
            status: service.status,
            createdAt: service.createdAt ?? null,
        }));
    }
}
