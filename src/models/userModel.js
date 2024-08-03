import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Schema, model } from "mongoose";
import { generateUniqueCode } from "../utils/features.js";
import { encryptPayload } from "../utils/secure.js";
import LiveToken from "./liveTokens.model.js";

dotenv.config();

export const userGenders = ["male", "female", "other"];

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 25,
            index: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 25,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false,
            trim: true,
        },
        phoneNumber: {
            type: String,
            unique: true,
            required: true,
            trim: true,
            index: true,
        },
        gender: {
            type: String,
            enum: userGenders,
            required: true,
        },
        role: {
            type: String,
            enum: ["user", "admin", "reportHandler", "postHandler"],
            default: "user",
        },
        bio: {
            type: String,
        },
        photo: {
            type: {
                fileName: {
                    type: String,
                    required: true,
                },
                fileId: {
                    type: String,
                    required: true,
                },
                url: {
                    type: String,
                    required: true,
                },
            },
        },
        posts: {
            type: [Schema.Types.ObjectId],
            ref: "Post",
            index: true,
        },
        followers: {
            type: [Schema.Types.ObjectId],
            ref: "User",
            index: true,
        },
        following: {
            type: [Schema.Types.ObjectId],
            ref: "User",
            index: true,
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
            unique: true,
            minlength: 15,
            index: true,
        },
        referredBy: {
            type: String,
            index: true,
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
                        required: true,
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
            select: false,
        },
        isBanned: {
            type: Boolean,
            default: false,
            select: false,
        },
        joinedEventsCount: {
            type: Number,
            default: 0,
            select: false,
        },
        loginAttempts: {
            type: Number,
            required: true,
            default: 0,
            select: false,
        },
        lockUntil: {
            type: Number,
            default: null,
            select: false,
        },
        otp: {
            type: String,
            default: null,
            select: false,
        },
        otpExpiry: {
            type: Date,
            default: null,
            select: false,
        },
        refreshTokens: [
            {
                uniqueId: { type: String, required: true, unique: true },
                token: { type: String, required: true, unique: true },
            },
        ],
    },
    { timestamps: true }
);

// -------------------------------------------------------------------------------------------
// Pre-save hooks for hashing password, generating referral code, and maintain referral points
// -------------------------------------------------------------------------------------------
userSchema.pre("save", async function (next) {
    const user = this;
    if (user.isModified("password")) {
        user.password = await bcrypt.hash(user.password, 10);
    }
    next();
});
userSchema.pre("save", function (next) {
    this.followersCount = this.followers?.length;
    this.followingCount = this.following?.length;
    this.referralCount = this.referredUsers?.length;
    this.joinedEventsCount = this.eventsAttend?.length;
    next();
});
userSchema.pre("save", async function (next) {
    const user = this;
    if (user.isNew) {
        let code = await generateUniqueCode();
        this.referralCode = code;
    }
    next();
});
userSchema.pre("save", async function (next) {
    const user = this;
    if ((user.isNew && user.referredBy) || this.isModified("referredBy")) {
        try {
            const referringUser = await User.findOne({ referralCode: user.referredBy });
            if (referringUser) {
                referringUser.points += 10;
                referringUser.referralPointsEarned += 10;
                referringUser.referredUsers = [...referringUser.referredUsers, user._id];
                await referringUser.save();
            }
        } catch (error) {
            console.error("Error updating points on referral:", error.message);
        }
    }
    next();
});

// --------------------------------------------------------------------------------
// methods for user schema for comparing password and update lastLogin state
// --------------------------------------------------------------------------------
userSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        console.error("Error during password comparison:", error.message);
    }
};
userSchema.methods.generateAccessToken = async function () {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    const expiresIn = process.env.ACCESS_TOKEN_EXPIRY_TIME;
    if (!secret || !expiresIn) throw new Error("Access token secret or expiry time is undefined");
    const payload = { _id: this._id };
    const token = jwt.sign(payload, secret, { expiresIn });
    return await encryptPayload(token);
};
userSchema.methods.generateRefreshToken = async function (uniqueId) {
    if (!uniqueId) throw new Error("uniqueId is Undefined for refresh token");
    const secret = process.env.REFRESH_TOKEN_SECRET;
    const expiresIn = process.env.REFRESH_TOKEN_EXPIRY_TIME;
    if (!secret || !expiresIn) throw new Error("Refresh token secret or expiry time is undefined");
    const payload = { _id: this._id };
    const token = jwt.sign(payload, secret, { expiresIn });
    // find unique id and remove this
    if (!this.refreshTokens) this.refreshTokens = [];
    this.refreshTokens = this.refreshTokens.filter((doc) => doc.uniqueId !== uniqueId);
    this.refreshTokens = [...this.refreshTokens, { uniqueId, token }];
    await Promise.all([this.save(), LiveToken.create({ refreshToken: token })]);
    return encryptPayload(token);
};
userSchema.statics.login = async function (userId) {
    try {
        const user = await this.findByIdAndUpdate(userId, {
            lastLogin: new Date(),
        });
        return user;
    } catch (error) {
        console.log(error?.message || "error during changing last login date from model");
        throw error;
    }
};
export const User = model("User", userSchema);
export default User;
