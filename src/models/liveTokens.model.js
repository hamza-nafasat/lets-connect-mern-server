import { model } from "mongoose";
import { Schema } from "mongoose";

const liveTokenSchema = new Schema(
    {
        refreshToken: { type: String, required: true, unique: true, trim: true },
        removedAfter: {
            type: Date,
            default: () =>
                new Date(Date.now() + process.env.REFRESH_TOKEN_EXPIRES_FROM_DATABASE_IN_SECONDS * 1000),
        },
    },
    { timestamps: true }
);

liveTokenSchema.index({ removedAfter: 1 }, { expireAfterSeconds: 0 });

const LiveToken = model("LiveToken", liveTokenSchema);

export default LiveToken;
