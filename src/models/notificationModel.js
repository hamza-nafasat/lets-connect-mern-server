import { Schema, model, Types } from "mongoose";

export const notificationTypes = ["like", "comment", "follow", "referred"];

const notificationSchema = new Schema(
    {
        fromUser: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
        },
        toUser: {
            type: Types.ObjectId,
            ref: "User",
            default: null,
        },
        type: {
            type: String,
            required: true,
            enum: notificationTypes,
        },
        postId: {
            type: Types.ObjectId,
            ref: "Post",
            default: null,
        },
        message: {
            type: String,
            required: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

const Notification = model("Notification", notificationSchema);

export default Notification;
