import express from "express";
import { isAdmin, isAuthenticated, isSupOrPostHandler } from "../middlewares/auth.js";
import {
    AddLikeOnGalleryPostCommentReply,
    AddReplyOnGalleryComment,
    LikeAGalleryPost,
    UpdateTheGalleryPostCommentReply,
    changeCommentAllow,
    changeShareAllow,
    commentAGalleryPost,
    createNewGalleryPost,
    deleteGalleryPostComment,
    deleteSingleGalleryPost,
    deleteTheGalleryPostCommentReply,
    getAllCommentsOfAPost,
    getPostByCategory,
    getSingleGalleryPost,
    likeAGalleryComment,
    shareAGalleryPost,
    updateGalleryPostComment,
    updateSingleGalleryPost,
} from "../controllers/galleryControllers.js";
import { singleUpload } from "../middlewares/multer.js";
import {
    commentReplySanitizer,
    commentSanitizer,
    newGalleryPostSanitizer,
    paginationSanitizer,
    updateGalleryPostSanitizer,
    validatorErrorHandler,
} from "../middlewares/expressValidator.js";

const app = express();

// CREATE NEW POST
app.post(
    "/create",
    isAuthenticated,
    isSupOrPostHandler,
    singleUpload,
    newGalleryPostSanitizer,
    validatorErrorHandler,
    createNewGalleryPost
);

// GET, UPDATE, AND DELETE SINGLE POST
app.route("/single/:postId")
    .get(isAuthenticated, getSingleGalleryPost)
    .delete(isAuthenticated, isSupOrPostHandler, deleteSingleGalleryPost)
    .put(
        isAuthenticated,
        isSupOrPostHandler,
        singleUpload,
        updateGalleryPostSanitizer,
        validatorErrorHandler,
        updateSingleGalleryPost
    );

// LIKE a gallery post
app.put("/post/like/:postId", isAuthenticated, LikeAGalleryPost);
// COMMENT on a gallery Post
app.put(
    "/post/comment/:postId",
    isAuthenticated,
    commentSanitizer,
    validatorErrorHandler,
    commentAGalleryPost
);
// Share a gallery Post
app.put("/post/share/:postId", isAuthenticated, shareAGalleryPost);

// GET ONE POST ALL COMMENTS
app.get("/post/all/comments/:postId", isAuthenticated, getAllCommentsOfAPost);

// UPDATE AND DELETE COMMENT
app.route("/post/comments/:postId/:commentId")
    .put(isAuthenticated, commentSanitizer, validatorErrorHandler, updateGalleryPostComment)
    .delete(isAuthenticated, deleteGalleryPostComment);

// LIKE A COMMENT
app.put("/post/comments/like/:postId/:commentId", isAuthenticated, likeAGalleryComment);

// REPLY A COMMENT
app.post(
    "/post/comments/reply/:postId/:commentId",
    isAuthenticated,
    commentReplySanitizer,
    validatorErrorHandler,
    AddReplyOnGalleryComment
);

// CHANGE ALLOW COMMENTS AND SHARES
app.put("/post/allow/comment/:postId", isAuthenticated, isSupOrPostHandler, changeCommentAllow);
app.put("/post/allow/share/:postId", isAuthenticated, isSupOrPostHandler, changeShareAllow);

// ADD LIKE UPDATE AND DELETE A REPLY OF COMMENT
app.route("/post/comments/replies/:postId/:commentId/:replyId")
    .post(isAuthenticated, AddLikeOnGalleryPostCommentReply)
    .put(isAuthenticated, commentReplySanitizer, validatorErrorHandler, UpdateTheGalleryPostCommentReply)
    .delete(isAuthenticated, deleteTheGalleryPostCommentReply);

// GET POST BY CATEGORY and search gallery
app.get(
    "/category/:category",
    isAuthenticated,
    paginationSanitizer,
    validatorErrorHandler,
    getPostByCategory
);

export default app;
