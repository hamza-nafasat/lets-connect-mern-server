import dotenv from "dotenv";
import { Schema, model } from "mongoose";

dotenv.config();

const userSchema = new Schema(
    {
        userId: {
            type: [Schema.Types.ObjectId],
            ref: "User",
        },
        name: String,
        username: String,
        email: String,
        password: String,
        phoneNumber: String,
        role: String,
        bio: String,
        photo: {
            type: {
                fileName: String,
                fileId: String,
                url: String,
            },
        },
        posts: {
            type: [Schema.Types.ObjectId],
            ref: "Post",
        },
        followers: {
            type: [Schema.Types.ObjectId],
            ref: "User",
        },
        following: {
            type: [Schema.Types.ObjectId],
            ref: "User",
        },
        followersCount: {
            type: Number,
            default: 0,
        },
        followingCount: {
            type: Number,
            default: 0,
        },
        badges: {
            type: [Schema.Types.ObjectId],
            ref: "Badge",
        },
        points: {
            type: Number,
            default: 0,
        },
        referralCode: {
            type: String,
            minlength: 15,
        },
        referredBy: {
            type: String,
        },
        referredUsers: {
            type: [Schema.Types.ObjectId],
            ref: "User",
            default: [],
        },
        referralPointsEarned: {
            type: Number,
            default: 0,
        },
        eventsAttend: {
            type: [
                {
                    eventId: {
                        type: Schema.Types.ObjectId,
                        ref: "Event",
                    },
                    createdAt: {
                        type: Date,
                        default: new Date(),
                    },
                },
            ],
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
            default: new Date(),
        },
        showBadges: {
            type: Boolean,
            default: true,
        },
        showPoints: {
            type: Boolean,
            default: true,
        },
        referralCount: {
            type: Number,
            default: 0,
        },
        isBanned: {
            type: Boolean,
            default: false,
        },
        joinedEventsCount: {
            type: Number,
            default: 0,
        },
        loginAttempts: {
            type: Number,
            default: 0,
        },
        lockUntil: {
            type: Number,
            default: null,
        },
    },
    { timestamps: true }
);

export const DeletedUser = model("DeletedUser", userSchema);
