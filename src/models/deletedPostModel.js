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
        postRealId: {
            type: Schema.Types.ObjectId,
            ref: "Post",
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        content: {
            type: String,
            trim: true,
            maxlength: 300,
        },
        category: {
            type: String,
            enum: postCategories,
        },
        mediaType: {
            type: String,
            enum: postMediaTypes,
        },
        media: {
            type: {
                fileName: {
                    type: String,
                },
                fileId: {
                    type: String,
                },
                url: {
                    type: String,
                },
            },
        },
        likes: {
            type: [Schema.Types.ObjectId],
            ref: "User",
        },
        comments: {
            type: [
                {
                    ownerId: {
                        type: Schema.Types.ObjectId,
                        ref: "User",
                    },
                    replies: {
                        type: [
                            {
                                ownerId: {
                                    type: Schema.Types.ObjectId,
                                    ref: "User",
                                },
                                likes: {
                                    type: [Schema.Types.ObjectId],
                                    ref: "User",
                                },
                                reply: {
                                    type: String,
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
                        trim: true,
                        maxlength: 100,
                    },
                    likes: {
                        type: [Schema.Types.ObjectId],
                        ref: "User",
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
            default: 0,
        },
        commentsCount: {
            type: Number,
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
        postCreatedAt: {
            type: Date,
        },
        postUpdatedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

const DeletedUserPosts = model("DeletedUserPosts", postSchema);

export default DeletedUserPosts;
