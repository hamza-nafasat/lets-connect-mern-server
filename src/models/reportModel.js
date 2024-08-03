import { Schema, model } from "mongoose";

export const reportReasons = ["misinformation", "hate speech", "nudity", "violence or threats", "other"];
export const reportStatuses = ["pending", "resolved", "ignored"];

const reportSchema = new Schema(
    {
        postId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "Post",
        },
        reporterId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        reason: {
            type: String,
            trim: true,
            enum: reportReasons,
            default: "other",
        },
        description: {
            type: String,
            maxlength: 200,
        },
        status: {
            type: String,
            enum: reportStatuses,
            default: "pending",
        },
    },
    {
        timestamps: true,
    }
);

const Report = model("Report", reportSchema);

export default Report;
