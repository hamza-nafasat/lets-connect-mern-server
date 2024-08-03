import { Schema, model } from "mongoose";

export const galleryCategories = ["image", "video", "reel"];
export const newsTypeForGallery = ["pakistani", "international"];

const gallerySchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User",
            index: true,
        },
        title: {
            type: String,
            trim: true,
            toLowerCase: true,
        },
        category: {
            type: String,
            required: true,
            enum: galleryCategories,
            index: true,
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
        youTubeUrl: {
            type: String,
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
                        index: true,
                    },
                    replies: {
                        type: [
                            {
                                ownerId: {
                                    type: Schema.Types.ObjectId,
                                    required: true,
                                    ref: "User",
                                    index: true,
                                },
                                likes: {
                                    type: [Schema.Types.ObjectId],
                                    ref: "User",
                                    index: true,
                                },
                                reply: {
                                    type: String,
                                    required: true,
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
        newsType: {
            type: String,
            enum: newsTypeForGallery,
            index: true,
        },
        shares: {
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
    },
    {
        timestamps: true,
    }
);
// -------------------------------------------
// Method to increment/decrement commentsCount
// -------------------------------------------
gallerySchema.methods.changeCommentsCount = function () {
    this.commentsCount = this.comments?.reduce(
        (total, comment) => total + 1 + (comment?.replies ? comment.replies.length : 0),
        0
    );
    return this.commentsCount;
};
// ----------------------------------------------------------
// Pre-save middleware to update likesCount and commentsCount
// ----------------------------------------------------------
gallerySchema.pre("save", function (next) {
    if (this.isModified("likes")) {
        this.likesCount = this.likes ? this.likes.length : 0;
    }
    if (this.isModified("comments")) {
        this.commentsCount = this.changeCommentsCount();
    }
    next();
});

const Gallery = model("Gallery", gallerySchema);
export default Gallery;
