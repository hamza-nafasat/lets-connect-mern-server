import { Schema, model } from "mongoose";

export const postCategories = [
    "business",
    "politics",
    "technology",
    "science",
    "health",
    "sports",
    "crime",
    "usersPost",
    "document",
];
export const postMediaTypes = ["text", "image", "video", "docs"];

const postSchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User",
            index: true,
        },
        content: {
            type: String,
            trim: true,
            maxlength: 300,
        },
        category: {
            type: String,
            required: true,
            enum: postCategories,
            index: true,
        },
        mediaType: {
            type: String,
            required: true,
            enum: postMediaTypes,
        },
        media: {
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
        likes: {
            type: [Schema.Types.ObjectId],
            ref: "User",
            index: true,
        },
        comments: {
            type: [
                {
                    ownerId: {
                        type: Schema.Types.ObjectId,
                        required: true,
                        ref: "User",
                    },
                    replies: {
                        type: [
                            {
                                ownerId: {
                                    type: Schema.Types.ObjectId,
                                    required: true,
                                    index: true,
                                    ref: "User",
                                },
                                likes: {
                                    type: [Schema.Types.ObjectId],
                                    ref: "User",
                                    index: true,
                                },
                                reply: {
                                    type: String,
                                    index: true,
                                    required: true,
                                },
                                createdAt: {
                                    type: Date,
                                    default: Date.now,
                                },
                                updatedAt: {
                                    type: Date,
                                    default: Date.now,
                                },
                            },
                        ],
                    },
                    content: {
                        type: String,
                        required: true,
                        trim: true,
                        maxlength: 100,
                    },
                    likes: {
                        type: [Schema.Types.ObjectId],
                        ref: "User",
                        index: true,
                    },
                    createdAt: {
                        type: Date,
                        default: Date.now,
                    },
                    updatedAt: {
                        type: Date,
                        default: Date.now,
                    },
                },
            ],
        },
        shares: {
            type: Number,
            default: 0,
        },
        likesCount: {
            type: Number,
            required: true,
            default: 0,
        },
        commentsCount: {
            type: Number,
            required: true,
            default: 0,
        },
        allowShares: {
            type: Boolean,
            default: true,
        },
        allowComments: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);
// Method to increment/decrement commentsCount
// -------------------------------------------
postSchema.methods.changeCommentsCount = function () {
    this.commentsCount = this.comments?.reduce(
        (total, comment) => total + 1 + (comment?.replies ? comment.replies.length : 0),
        0
    );
    return this.commentsCount;
};
// Pre-save middleware to update likesCount and commentsCount
// ----------------------------------------------------------
postSchema.pre("save", function (next) {
    if (this.isModified("likes")) {
        this.likesCount = this.likes ? this.likes.length : 0;
    }
    if (this.isModified("comments")) {
        this.commentsCount = this.changeCommentsCount();
    }
    next();
});

postSchema.index({ createdAt: -1, likesCount: -1, commentsCount: -1, shares: -1 });

const Post = model("Post", postSchema);

export default Post;
