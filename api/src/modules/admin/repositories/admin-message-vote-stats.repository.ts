import { ObjectId } from "mongodb";
import {
    MESSAGES_COLLECTION,
    type MessageDocument,
} from "src/database/mongodb/models/message.model";
import {
    VOTE_RESPONSES_COLLECTION,
    VOTES_COLLECTION,
} from "src/database/mongodb/models/vote.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

type GroupCountRow = { _id: string | null; count: number };
type DayCountRow = { _id: string; count: number };

export class AdminMessageVoteStatsRepository {
    constructor(private readonly mongo: MongoDatabase) {}

    async getTotalMessages(): Promise<number> {
        return this.mongo.collection(MESSAGES_COLLECTION).countDocuments();
    }

    async getMessagesByDay(
        since: Date,
    ): Promise<{ date: string; count: number }[]> {
        const rows = await this.mongo
            .collection(MESSAGES_COLLECTION)
            .aggregate<DayCountRow>([
                { $match: { createdAt: { $gte: since } } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt",
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ])
            .toArray();

        return rows.map((r) => ({ date: r._id, count: r.count }));
    }

    async getVotesByType(): Promise<{ type: string; count: number }[]> {
        const rows = await this.mongo
            .collection(VOTES_COLLECTION)
            .aggregate<GroupCountRow>([
                { $group: { _id: "$type", count: { $sum: 1 } } },
            ])
            .toArray();

        return rows.map((r) => ({
            type: r._id ?? "unknown",
            count: r.count,
        }));
    }

    async countVoteResponses(): Promise<number> {
        return this.mongo
            .collection(VOTE_RESPONSES_COLLECTION)
            .countDocuments();
    }

    async findReportedMessages(
        minReports: number,
    ): Promise<(MessageDocument & { reportCount: number })[]> {
        const docs = await this.mongo
            .collection<MessageDocument>(MESSAGES_COLLECTION)
            .find({
                reports: { $exists: true },
                $expr: { $gte: [{ $size: "$reports" }, minReports] },
            })
            .sort({ reports: -1 })
            .toArray();

        return docs.map((msg) => ({
            ...msg,
            reportCount: msg.reports?.length ?? 0,
        }));
    }

    async findMessageById(id: string): Promise<MessageDocument | null> {
        return this.mongo
            .collection<MessageDocument>(MESSAGES_COLLECTION)
            .findOne({ _id: new ObjectId(id) });
    }

    async deleteMessage(id: string): Promise<void> {
        await this.mongo
            .collection<MessageDocument>(MESSAGES_COLLECTION)
            .deleteOne({ _id: new ObjectId(id) });
    }
}
