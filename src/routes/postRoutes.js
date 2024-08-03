import express from "express";
import {
    AddLikeOnCommentReply,
    AddReplyOnComment,
    LikeAPost,
    UpdateTheCommentReply,
    changeCommentAllow,
    changeShareAllow,
    commentAPost,
    createNewPost,
    deleteComment,
    deleteSinglePost,
    deleteTheCommentReply,
    getAllCommentsOfAPost,
    getMyAllPosts,
    getPostByCategory,
    getPostByFollowing,
    getPostByPopularity,
    getSinglePost,
    getSingleUsersPosts,
    likeAComment,
    shareAPost,
    updateComment,
    updateSinglePost,
} from "../controllers/postControllers.js";
import { isAuthenticated } from "../middlewares/auth.js";
import {
    commentReplySanitizer,
    commentSanitizer,
    newPostSanitizer,
    paginationSanitizer,
    validatorErrorHandler,
} from "../middlewares/expressValidator.js";
import { singleUpload } from "../middlewares/multer.js";

const app = express();

// CREATE NEW POST
app.post("/create", isAuthenticated, singleUpload, newPostSanitizer, validatorErrorHandler, createNewPost);

// GET, UPDATE, AND DELETE SINGLE POST
app.route("/single/:postId")
    .get(isAuthenticated, getSinglePost)
    .delete(isAuthenticated, deleteSinglePost)
    .put(isAuthenticated, singleUpload, newPostSanitizer, validatorErrorHandler, updateSinglePost);

// LIKE a Post
app.put("/post/like/:postId", isAuthenticated, LikeAPost);
// COMMENT on a Post
app.post("/post/comment/:postId", isAuthenticated, commentSanitizer, validatorErrorHandler, commentAPost);
// Share a Post
app.put("/post/share/:postId", isAuthenticated, shareAPost);

// UPDATE AND DELETE COMMENT
app.route("/post/comments/:postId/:commentId")
    .put(isAuthenticated, commentSanitizer, validatorErrorHandler, updateComment)
    .delete(isAuthenticated, deleteComment);

// LIKE A COMMENT
app.put("/post/comments/like/:postId/:commentId", isAuthenticated, likeAComment);

// REPLY A COMMENT
app.post(
    "/post/comments/reply/:postId/:commentId",
    isAuthenticated,
    commentReplySanitizer,
    validatorErrorHandler,
    AddReplyOnComment
);

// ALLOW COMMENTS AND SHARE
app.put("/post/allow/comments/:postId", isAuthenticated, changeCommentAllow);
app.put("/post/allow/shares/:postId", isAuthenticated, changeShareAllow);

// ADD LIKE UPDATE AND DELETE A REPLY OF COMMENT
app.route("/post/comments/replies/:postId/:commentId/:replyId")
    .post(isAuthenticated, AddLikeOnCommentReply)
    .put(isAuthenticated, commentReplySanitizer, validatorErrorHandler, UpdateTheCommentReply)
    .delete(isAuthenticated, deleteTheCommentReply);

// GET ONE POST ALL COMMENTS
app.get("/post/all/comments/:postId", isAuthenticated, getAllCommentsOfAPost);

// GET POST BY CATEGORY
app.get(
    "/category/:category",
    isAuthenticated,
    paginationSanitizer,
    validatorErrorHandler,
    getPostByCategory
);

// GET all my posts
app.get("/my/all", isAuthenticated, paginationSanitizer, validatorErrorHandler, getMyAllPosts);
// GET all user
app.get(
    "/user/single/:userId",
    isAuthenticated,
    paginationSanitizer,
    validatorErrorHandler,
    getSingleUsersPosts
);
// GET popular posts
app.get("/popular", isAuthenticated, getPostByPopularity);
// GET posts by following
app.get("/following", isAuthenticated, getPostByFollowing);

export default app;
