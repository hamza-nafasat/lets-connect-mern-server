import { Schema, model, Types } from "mongoose";

const eventsSchema = new Schema(
    {
        ownerId: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number],
                required: true,
            },
        },
        title: {
            type: String,
            trim: true,
            toLowerCase: true,
            maxlength: 100,
            required: true,
            index: true,
            index: true,
        },
        poster: {
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
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
        },
        liveUrl: {
            type: String,
        },
        images: [
            {
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
        ],
        Videos: [
            {
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
        ],
        likes: [
            {
                type: Types.ObjectId,
                ref: "User",
                index: true,
            },
        ],
        comments: [
            {
                ownerId: {
                    type: Types.ObjectId,
                    ref: "User",
                    required: true,
                    index: true,
                },
                content: {
                    type: String,
                    required: true,
                    trim: true,
                    index: true,
                    maxlength: 255,
                },
                replies: [
                    {
                        ownerId: {
                            type: Types.ObjectId,
                            ref: "User",
                            required: true,
                            index: true,
                        },
                        reply: {
                            type: String,
                            required: true,
                            trim: true,
                            maxlength: 255,
                            index: true,
                        },
                        likes: [
                            {
                                type: Types.ObjectId,
                                ref: "User",
                                index: true,
                            },
                        ],
                    },
                ],
                likes: [
                    {
                        type: Types.ObjectId,
                        ref: "User",
                        index: true,
                    },
                ],
            },
        ],
        shares: {
            type: Number,
            default: 0,
        },
        likesCount: {
            type: Number,
            default: 0,
        },
        commentsCount: {
            type: Number,
            default: 0,
        },
        allowComments: {
            type: Boolean,
            default: true,
        },
        allowShares: {
            type: Boolean,
            default: true,
        },
        attendence: {
            type: [
                {
                    userId: {
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
        attendenceCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// -------------------------------------------
// Method to increment/decrement commentsCount
// -------------------------------------------
eventsSchema.methods.changeCommentsCount = function () {
    this.commentsCount = this.comments?.reduce(
        (total, comment) => total + 1 + (comment?.replies ? comment.replies.length : 0),
        0
    );
    return this.commentsCount;
};
// ----------------------------------------------------------
// Pre-save middleware to update likesCount and commentsCount
// ----------------------------------------------------------
eventsSchema.pre("save", function (next) {
    if (this.isModified("likes")) {
        this.likesCount = this.likes ? this.likes.length : 0;
    }
    if (this.isModified("comments")) {
        this.commentsCount = this.changeCommentsCount();
    }
    if (this.isModified("attendence")) {
        this.attendenceCount = this.attendence?.length;
    }
    next();
});

const Event = model("Event", eventsSchema);

export default Event;
