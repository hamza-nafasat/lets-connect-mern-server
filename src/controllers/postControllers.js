import { isValidObjectId } from "mongoose";
import { CustomError, asyncHandler } from "../middlewares/asyncHandler.js";
import Post, { postCategories, postMediaTypes } from "../models/postModel.js";
import { deleteFromBlackBlaze, uploadOnBlackBlaze } from "../utils/blackblaze-b2.js";
import User from "../models/userModel.js";
import DeletedUserPosts from "../models/deletedPostModel.js";

// ------------------------------------------------------
// http://localhost:4000/api/v1/posts/category/:category
// ------------------------------------------------------
// GET ALL POST BY CATEGORY

export const getPostByCategory = asyncHandler(async (req, res, next) => {
    // 1. Getting post category from params and validate
    const { category } = req.params;
    if (!postCategories.includes(category) && category !== "all") {
        return next(new CustomError("Please Enter a Valid Category", 400));
    }
    const { page = 1, onePageLimit = parseInt(process.env.PRODUCT_PER_PAGE) } = req.query;
    const skipProducts = onePageLimit * (page - 1);
    // 2. Fetch all posts from that category
    let baseQuery = {};
    if (category && category !== "all") {
        baseQuery.category = category;
    }
    const [posts, totalPosts] = await Promise.all([
        Post.find(baseQuery)
            .sort({ createdAt: -1 })
            .skip(skipProducts)
            .limit(onePageLimit)
            .populate("ownerId", "name username photo")
            .lean(),
        Post.countDocuments(baseQuery),
    ]);
    if (!posts) return next(new CustomError("Posts not found for this category", 404));
    const totalPages = Math.ceil(totalPosts / onePageLimit);
    res.status(200).json({
        success: true,
        length: posts.length,
        totalPages,
        data: posts,
    });
});
// -------------------------------------------------
// http://localhost:4000/api/v1/posts/single/:userId
// --------------------------------------------------
// GET single user posts

export const getSingleUsersPosts = asyncHandler(async (req, res, next) => {
    // 1. Getting post category from params and validate
    const { userId } = req.params;
    if (!userId) return next(new CustomError("User Id Not Found", 400));
    const { page = 1, onePageLimit = process.env.PRODUCT_PER_PAGE } = req.query;
    const skipProducts = onePageLimit * (page - 1);
    // 2. Fetch all posts of user
    const posts = await Post.find({ ownerId: userId })
        .sort({ createdAt: -1 })
        .skip(skipProducts)
        .limit(onePageLimit)
        .populate("ownerId", "name username photo");
    res.status(200).json({
        success: true,
        length: posts ? posts.length : 0,
        data: posts,
    });
});
// -----------------------------------------
// http://localhost:4000/api/v1/posts/my/all
// -----------------------------------------
// GET my All posts

export const getMyAllPosts = asyncHandler(async (req, res, next) => {
    // 1. Getting post category from params and validate
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id Not Found", 500));
    const { page = 1, onePageLimit = process.env.PRODUCT_PER_PAGE } = req.query;
    const skipProducts = onePageLimit * (page - 1);
    // 2. Fetch all posts of user
    const posts = await Post.find({ ownerId: userId })
        .sort({ createdAt: -1 })
        .skip(skipProducts)
        .limit(onePageLimit)
        .populate("ownerId", "name username photo");
    if (!posts) return next(new CustomError("Posts not found", 404));
    res.status(200).json({
        success: true,
        length: posts ? posts.length : 0,
        data: posts,
    });
});

// ------------------------------------------
// http://localhost:4000/api/v1/posts/create
// ------------------------------------------
// CREATE NEW POST

export const createNewPost = asyncHandler(async (req, res, next) => {
    const user = req.user;
    console.log(user);
    if (!user) return next(new CustomError("User is Not Found", 500));
    // 1. Destructure Data From Body
    let { content = "", category = "", mediaType = "", allowComments, allowShares } = req.body;
    let media = false;
    const file = req.file;
    // 2. Basic validation using short-circuit evaluation
    if (!content && !file) {
        return next(new CustomError("Please Add Content or Media", 400));
    }
    if (!mediaType) return next(new CustomError("Please Add Media Type", 400));
    if (mediaType === "text" && !content) {
        return next(new CustomError("Invalid Data for new post", 400));
    }
    if (["image", "video", "docs"].includes(mediaType) && !file) {
        return next(new CustomError("Media File is Not Found", 400));
    }
    if (category !== "usersPost" && postCategories.includes(category)) {
        if (user.role !== "admin" && user.role !== "postHandler")
            return next(new CustomError("Only Admin Or PostHandler Can Do This", 401));
    }
    if (!category) category = "usersPost";
    if (category && category !== "usersPost" && !postCategories.includes(category)) {
        return next(new CustomError("Invalid category", 400));
    }
    if (file) media = await uploadOnBlackBlaze(file);
    // 3. Creating a Post
    const postData = {
        ownerId: user._id,
        mediaType,
        ...(content && { content: content.trim() }),
        ...(category && { category }),
        ...(media && { media }),
    };
    if (allowComments == "yes") postData.allowComments = true;
    if (allowShares == "yes") postData.allowShares = true;
    if (allowComments == "no") postData.allowComments = false;
    if (allowShares == "no") postData.allowShares = false;
    const post = await Post.create(postData);
    if (!post) {
        return next(new CustomError("Something Wrong With Post Creating", 400));
    }
    // 4. Send Response after creating a new product
    res.status(201).json({
        success: true,
        message: "Post Created Successfully",
    });
});

// --------------------------------------------------
// http://localhost:4000/api/v1/posts/single/:postId
// --------------------------------------------------
// Get, UPDATE, AND DELETE POST

export const getSinglePost = asyncHandler(async (req, res, next) => {
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post ID", 400));
    }
    // 2. Fetching the post from database
    const post = await Post.findById(postId).populate("ownerId", "name username photo");
    if (!post) return next(new CustomError("Post Not Found", 404));
    // 3. Send Response
    res.status(201).json({
        success: true,
        post,
    });
});

export const deleteSinglePost = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post ID", 400));
    }
    const post = await Post.findById(postId);
    if (!post) {
        return next(new CustomError("Post not found", 404));
    } else if (post.category === "usersPost" && post.ownerId.toString() !== user._id.toString()) {
        return next(new CustomError("Unauthorized to update this post", 403));
    } else if (post.category !== "usersPost" && user.role !== "admin" && user.role !== "postHandler") {
        return next(new CustomError("Only Admin or Post Handler Team Can Do This", 403));
    }
    // now send this post in deleted posts
    if (post.category == "usersPost") {
        const deletedPost = await DeletedUserPosts.create({
            postRealId: postId,
            ownerId: post.ownerId,
            mediaType: post.mediaType,
            media: post.media,
            content: post.content || "Nothing",
            category: post.category,
            allowComments: post.allowComments,
            allowShares: post.allowShares,
            comments: post.comments,
            likes: post.likes,
            postCreatedAt: post.createdAt,
            postUpdatedAt: post.updatedAt,
            commentsCount: post.commentsCount,
            likesCount: post.likesCount,
            shares: post.shares,
        });
        if (!deletedPost) return next(new CustomError("Something went wrong while deleted post", 500));
    }
    await Post.deleteOne({ _id: postId });
    // 3. Send Response
    res.status(200).json({
        success: true,
        message: "Post Deleted Successfully",
    });
});

export const updateSinglePost = asyncHandler(async (req, res, next) => {
    const user = req.user;
    console.log("HY");
    if (!user) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post ID", 400));
    }
    // 2. Destructure Data from body
    const { content = "", category = "", mediaType = "", allowComments, allowShares } = req.body;
    let media = false;
    const file = req.file;
    if (!content && !mediaType && !category && !file && !allowComments && !allowShares) {
        return next(new CustomError("No data provided for update", 400, 400));
    }
    // 3. Fetch the post and verify ownership
    const post = await Post.findById(postId);
    if (!post) {
        return next(new CustomError("Post not found", 404));
    } else if (post.category === "usersPost" && post.ownerId.toString() !== user._id.toString()) {
        return next(new CustomError("Unauthorized to update this post", 403));
    } else if (post.category !== "usersPost" && user.role !== "admin" && user.role !== "postHandler") {
        return next(new CustomError("Only Admin or Post Handler Team Can Do This", 403));
    }
    if (file) {
        if (post.media) {
            const fileName = post.media.fileName;
            const FileId = post.media.fileId;
            const result = await deleteFromBlackBlaze(FileId, fileName);
            if (result) {
                console.log("old file Deleted Successfully");
            }
        }
        media = await uploadOnBlackBlaze(file);
    }
    // 4. Some Validations and Add Update data
    if (content) post.content = content.trim();
    if (allowComments == "yes") post.allowComments = true;
    if (allowComments == "no") post.allowComments = false;
    if (allowShares == "yes") post.allowShares = true;
    if (allowShares == "no") post.allowShares = false;
    if (category && postCategories.includes(category)) post.category = category;
    if (file) post.media = media;
    if (mediaType && postMediaTypes.includes(mediaType)) post.mediaType = mediaType;
    // 6. Update the post and send Response
    let updatedPost = await post.save();
    if (!updatedPost) {
        return next(new CustomError("Something Wrong While Updating Post", 500));
    }
    res.status(200).json({
        success: true,
        message: "Post Updated Successfully",
    });
});

// -----------------------------------------------------
// http://localhost:4000/api/v1/posts/post/like/:postId
// -----------------------------------------------------
// like a post

export const LikeAPost = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post ID", 400));
    }
    // 2. Fetch post
    const post = await Post.findById(postId).select("likes");
    if (!post) return next(new CustomError("Posts not found", 404));
    // 3. check if user already like then dislike else like
    let alreadyLiked = post.likes.some((like) => like.toString() === userId.toString());
    if (alreadyLiked) post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
    else post.likes.push(userId);
    // 4. save post and send Response
    await post.save();
    res.status(200).json({
        success: true,
        message: alreadyLiked ? "Post Disliked Successfully" : "Post Liked Successfully",
    });
});

// --------------------------------------------------------
// http://localhost:4000/api/v1/posts/post/comment/:postId
// --------------------------------------------------------
// COMMENT on a post

export const commentAPost = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) return next(new CustomError("Invalid Post ID", 400));
    // 2. destructure content of comment from body
    const { content } = req.body;
    if (!content) return next(new CustomError("Please Enter a Valid Content for Comment", 400));
    // 3. Fetch post and add comment
    const post = await Post.findById(postId).select("comments allowComments");
    if (!post) {
        return next(new CustomError("Posts not found", 404));
    } else if (!post.allowComments) {
        return next(new CustomError("Comments are Off for This Post", 400));
    }
    post.comments.push({ ownerId: userId, content });
    post.changeCommentsCount();
    // 4. save post and send Response
    await post.save();
    res.status(201).json({
        success: true,
        message: "Comment Added Successfully",
    });
});

// --------------------------------------------------------------------
// http://localhost:4000/api/v1/posts/post/comments/:postId/:commentId
// --------------------------------------------------------------------
// LIKE UPDATE AND DELETE COMMENT

export const updateComment = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting postId from params and validate
    const { commentId, postId } = req.params;
    if (!isValidObjectId(postId) || !isValidObjectId(commentId)) {
        return next(new CustomError("Invalid Post or Comment ID", 400));
    }
    // 2. destructure content of comment from body
    const { content } = req.body;
    if (!content) return next(new CustomError("Please Add Content First", 400));
    if (!commentId || !isValidObjectId(commentId)) {
        return next(new CustomError("Please Enter A Valid Comment Id", 400));
    }
    // 3. Fetch post and get the comment
    const post = await Post.findById(postId);
    if (!post) return next(new CustomError("Posts not found", 404));
    const comment = post.comments.find((comment) => String(comment._id) === String(commentId));
    // 4. Validate comment and check that this user is eligible to change this or not
    if (!comment) {
        return next(new CustomError("Comment Not Found", 404));
    } else if (String(comment.ownerId) !== String(userId)) {
        return next(new CustomError("Unauthorized to update this comment", 403));
    }
    // 5. Update Comment and save the post with updated value
    comment.content = content;
    comment.updatedAt = Date.now();
    post.changeCommentsCount();
    let newPost = await post.save();
    if (!newPost) return next(new CustomError("Error While Updating Comment"));
    // 6. Response
    res.status(200).json({
        success: true,
        message: "Comment Updated Successfully",
    });
});
export const deleteComment = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting postId from params and validate
    const { postId, commentId } = req.params;
    if (!isValidObjectId(postId) || !isValidObjectId(commentId)) {
        return next(new CustomError("Invalid Post or Comment ID", 400));
    }
    // 3. Fetch post and get the comment
    const post = await Post.findById(postId).select("comments ownerId");
    if (!post) return next(new CustomError("Posts not found", 404));
    const comment = post.comments.id(commentId);
    // 4. Validate comment and check that this user is eligible to change this or not
    if (!comment) {
        return next(new CustomError("Comment Not Found", 404));
    } else if (String(comment.ownerId) !== String(userId) && String(post.ownerId) !== String(userId)) {
        return next(new CustomError("Unauthorized to Delete this Comment", 403));
    }
    // 5. Delete Comment and save the post
    post.comments = post.comments.filter((comment) => comment._id.toString() != commentId.toString());
    post.changeCommentsCount();
    const newPost = await post.save();
    if (!newPost) return next(new CustomError("Error While Deleting Comment"));
    // 6. Response
    res.status(200).json({
        success: true,
        message: "Comment Deleted Successfully",
    });
});

// ------------------------------------------------------------------------
// http://localhost:4000/api/v1/posts/post/comments/like/:postId/:commentId
// ------------------------------------------------------------------------
// LIKE A COMMENT

export const likeAComment = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId, commentId } = req.params;
    if (!isValidObjectId(postId) || !isValidObjectId(commentId)) {
        return next(new CustomError("Invalid Post or Comment ID", 400));
    }
    // 3. Fetch post and get the comment
    const post = await Post.findById(postId).select("comments");
    if (!post) return next(new CustomError("Posts not found", 404));
    const comment = post.comments.id(commentId);
    if (!comment) return next(new CustomError("Comment Not Found", 404));
    // 4. add a like in that comment
    const alreadyLiked = comment.likes.some((id) => String(id) === String(userId));
    if (alreadyLiked) {
        comment.likes = comment.likes.filter((id) => String(id) !== String(userId));
    } else {
        comment.likes.push(userId);
    }
    // 4. save post and send Response
    await post.save();
    res.status(200).json({
        success: true,
        message: alreadyLiked ? "Comment Disliked Successfully" : "Comment LIked Successfully",
    });
});

// -------------------------------------------------------------------------
// http://localhost:4000/api/v1/posts/post/comments/reply/:postId/:commentId
// -------------------------------------------------------------------------
// Add a reply on comment

export const AddReplyOnComment = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId, commentId } = req.params;
    if (!isValidObjectId(postId) || !isValidObjectId(commentId)) {
        return next(new CustomError("Invalid Post or Comment ID", 400));
    }
    // 2. destructure reply of comment from body
    const { reply } = req.body;
    if (!reply) return next(new CustomError("Please Enter a Valid Reply", 400));
    // 3. Fetch post and replied comment and add a new reply
    const result = await Post.updateOne(
        { _id: postId, "comments._id": commentId },
        {
            $push: { "comments.$.replies": { ownerId: userId, reply } },
            $inc: { commentsCount: 1 },
        }
    );
    if (result.modifiedCount === 0) return next(new CustomError("Post or Comment Not Found", 404));
    res.status(201).json({
        success: true,
        message: "Reply Added Successfully",
    });
});

// -------------------------------------------------------------------------------------
// http://localhost:4000/api/v1/posts/post/comments/replies/:postId/:commentId/:replyId
// -------------------------------------------------------------------------------------
// update delete and like a comment

export const UpdateTheCommentReply = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId, commentId, replyId } = req.params;
    if (!isValidObjectId(postId) || !isValidObjectId(commentId) || !isValidObjectId(replyId)) {
        return next(new CustomError("Invalid Post, Comment, or Reply ID", 400));
    }
    // 2. destructure reply of comment from body
    const { reply } = req.body;
    if (!reply) return next(new CustomError("Please Enter a Valid Reply For Update", 400));
    // 3. Fetch post and replied comment
    const post = await Post.findById(postId).select("comments");
    if (!post) return next(new CustomError("Posts not found", 404));
    // 4. get the target comment
    let comment = post.comments.id(commentId);
    if (!comment) return next(new CustomError("Comment Not Found", 404));
    // 5. get the target reply for update
    let replyForUpdate = comment.replies.id(replyId);
    if (!replyForUpdate) {
        return next(new CustomError("Reply Not Found", 400));
    } else if (String(replyForUpdate.ownerId) !== String(userId)) {
        return next(new CustomError("Unauthorized To Update The Reply", 403));
    }
    replyForUpdate.reply = reply;
    // 6. save post and send Response
    post.changeCommentsCount();
    await post.save();
    res.status(200).json({
        success: true,
        message: "Reply Updated Successfully",
    });
});
export const deleteTheCommentReply = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId, commentId, replyId } = req.params;
    if (!isValidObjectId(postId) || !isValidObjectId(commentId) || !isValidObjectId(replyId)) {
        return next(new CustomError("Invalid Post, Comment, or Reply ID", 400));
    }
    // 2. Fetch post and replied comment
    const post = await Post.findById(postId).select("comments ownerId");
    if (!post) return next(new CustomError("Posts not found", 404));
    // 3. get the target comment
    let comment = post.comments.id(commentId);
    if (!comment) return next(new CustomError("Comment Not Found", 404));
    // 4. get the target reply check auth and delete
    let replyForDelete = comment.replies.id(replyId);
    if (!replyForDelete) {
        return next(new CustomError("Reply Not Found", 400));
    } else if (String(replyForDelete.ownerId) !== String(userId) && String(post.ownerId) !== String(userId)) {
        return next(new CustomError("Unauthorized To Delete The Reply", 403));
    }
    await replyForDelete.deleteOne();
    // 5. save post and send Response
    post.changeCommentsCount();
    await post.save();
    res.status(200).json({
        success: true,
        message: "Reply Deleted Successfully",
    });
});
export const AddLikeOnCommentReply = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId, commentId, replyId } = req.params;
    if (!isValidObjectId(postId) || !isValidObjectId(commentId) || !isValidObjectId(replyId)) {
        return next(new CustomError("Invalid Post, Comment, or Reply ID", 400));
    }
    // 2. Fetch post and replied comment
    const post = await Post.findById(postId).select("comments ownerId");
    if (!post) return next(new CustomError("Posts not found", 404));
    // 3. get the target comment
    let comment = post.comments.id(commentId);
    if (!comment) return next(new CustomError("Comment Not Found", 404));
    // 4. get the target reply
    let replyForLike = comment.replies.id(replyId);
    if (!replyForLike) {
        return next(new CustomError("Reply Not Found", 400));
    }
    let alreadyLiked = replyForLike.likes.some((id) => String(id) === String(userId));
    if (alreadyLiked) {
        replyForLike.likes = replyForLike.likes.filter((id) => String(id) !== String(userId));
    } else {
        replyForLike.likes.push(userId);
    }
    // 5. save post and send Response
    await post.save();
    res.status(200).json({
        success: true,
        message: alreadyLiked ? "Reply Disliked Successfully" : "Reply Liked Successfully",
    });
});

// ------------------------------------------------------
// http://localhost:4000/api/v1/posts/post/share/:postId
// ------------------------------------------------------
// share a post

export const shareAPost = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post ID", 400));
    }
    // 2. Fetch post and replied comment
    const post = await Post.findById(postId).select("shares allowShares");
    if (!post) {
        return next(new CustomError("Posts not found", 404));
    } else if (!post.allowShares) {
        return next(new CustomError("Sharing are Off for This Post", 400));
    }
    // 3. add one share in post
    post.shares += 1;
    // 5. save post and send Response
    await post.save();
    res.status(200).json({
        success: true,
        message: "Post Shared Successfully",
    });
});

// ---------------------------------------------------------------
// http://localhost:4000/api/v1/posts/post/allow/comment/:postId
// ---------------------------------------------------------------
// CHANGE ALLOW COMMENTS

export const changeCommentAllow = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post ID", 400));
    }
    // 3. Fetch post and replied comment and add a new reply
    const post = await Post.findById(postId);
    if (!post) {
        return next(new CustomError("Post Not Found", 404));
    } else if (String(post.ownerId) !== String(userId)) {
        return next(new CustomError("Yor Are Not Authorized For This Action", 403));
    }
    post.allowComments = !post.allowComments;
    await post.save();
    res.status(201).json({
        success: true,
        message: `${!post.allowComments ? "Comments Are Off Now" : "Comments Are On Now"} `,
    });
});

// ---------------------------------------------------------------
// http://localhost:4000/api/v1/posts/post/allow/share/:postId
// ---------------------------------------------------------------
// CHANGE ALLOW Share

export const changeShareAllow = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post ID", 400));
    }
    // 3. Fetch post and replied comment and add a new reply
    const post = await Post.findById(postId);
    if (!post) {
        return next(new CustomError("Post Not Found", 404));
    } else if (String(post.ownerId) !== String(userId)) {
        return next(new CustomError("Yor Are Not Authorized For This Action", 403));
    }
    post.allowShares = !post.allowShares;
    await post.save();
    res.status(201).json({
        success: true,
        message: `${!post.allowShares ? "Sharing Are Off Now" : "Sharing Are On Now"} `,
    });
});

// -------------------------------------------
// http://localhost:4000/api/v1/posts/popular
// -------------------------------------------
// GET ALL POPULAR POSTS

export const getPostByPopularity = asyncHandler(async (req, res, next) => {
    const { page = 1, onePageLimit = process.env.PRODUCT_PER_PAGE } = req.query;
    const skipProducts = (page - 1) * onePageLimit;
    // 1. Define the date Five days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 5);
    // 2. Aggregate posts to sort by popularity and date
    const posts = await Post.aggregate([
        {
            $match: {
                category: "usersPost",
            },
        },
        {
            $addFields: {
                isRecent: {
                    $cond: [{ $gte: ["$createdAt", twoDaysAgo] }, true, false],
                },
                popularityScore: { $add: ["$likesCount", "$commentsCount", "$shares"] },
            },
        },
        {
            $sort: {
                isRecent: -1,
                popularityScore: -1,
            },
        },
        { $skip: Number(skipProducts) },
        { $limit: Number(onePageLimit) },
        {
            $lookup: {
                from: "users",
                let: { ownerId: "$ownerId" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$ownerId"] } } },
                    { $project: { photo: 1, name: 1, username: 1 } },
                ],
                as: "ownerDetails",
            },
        },
        {
            $unwind: "$ownerDetails",
        },
        {
            $project: {
                _id: 1,
                content: 1,
                shares: 1,
                likesCount: 1,
                commentsCount: 1,
                likes: 1,
                createdAt: 1,
                updatedAt: 1,
                allowShares: 1,
                ownerId: {
                    _id: "$ownerDetails._id",
                    name: "$ownerDetails.name",
                    username: "$ownerDetails.username",
                    photo: {
                        $cond: {
                            if: "$ownerDetails.photo",
                            then: "$ownerDetails.photo",
                            else: "$$REMOVE",
                        },
                    },
                },
                mediaType: 1,
                category: 1,
                media: 1,
            },
        },
    ]);
    let length = 0;
    if (posts.length) length = posts.length;
    // 3. Response
    res.status(200).json({
        success: true,
        length: length,
        data: posts,
    });
});

// -------------------------------------------------
// http://localhost:4000/api/v1/posts/followeing
// -------------------------------------------------
// GET POST BY FOLLOWING

export const getPostByFollowing = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id).select("following");
    if (!user) return next(new CustomError("User not found", 404));
    const { page = 1, onePageLimit = process.env.PRODUCT_PER_PAGE } = req.query;
    const skipProducts = onePageLimit * (page - 1);
    // Define the date five days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 5);
    // Aggregate posts to sort by popularity and date
    const posts = await Post.aggregate([
        {
            $match: {
                ownerId: { $in: user.following },
                category: "usersPost",
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        { $skip: Number(skipProducts) },
        { $limit: Number(onePageLimit) },
        {
            $lookup: {
                from: "users",
                let: { ownerId: "$ownerId" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$ownerId"] } } },
                    { $project: { photo: 1, name: 1, username: 1 } },
                ],
                as: "ownerDetails",
            },
        },
        {
            $unwind: "$ownerDetails",
        },
        {
            $project: {
                _id: 1,
                content: 1,
                shares: 1,
                likesCount: 1,
                commentsCount: 1,
                likes: 1,
                createdAt: 1,
                updatedAt: 1,
                media: 1,
                mediaType: 1,
                category: 1,
                allowShares: 1,
                ownerId: {
                    _id: "$ownerDetails._id",
                    name: "$ownerDetails.name",
                    username: "$ownerDetails.username",
                    photo: {
                        $cond: {
                            if: "$ownerDetails.photo",
                            then: "$ownerDetails.photo",
                            else: "$$REMOVE",
                        },
                    },
                },
            },
        },
    ]);
    let length = 0;
    if (posts.length) length = posts.length;
    // Response
    res.status(200).json({
        success: true,
        length: length,
        data: posts,
    });
});

// --------------------------------------------------------
// http://localhost:4000/api/v1/posts/all/comments/:postId
// --------------------------------------------------------
// GET ALL COMMENTS OF A POST

export const getAllCommentsOfAPost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    if (!isValidObjectId(postId)) return next(new CustomError("Invalid Post Id", 400));
    const { page = 1, onePageLimit = 20 } = req.query;
    const skipComments = (page - 1) * onePageLimit;
    const post = await Post.findById(postId)
        .populate("comments.ownerId", "name username photo")
        .populate("comments.replies.ownerId", "name username photo");
    if (!post) return next(new CustomError("Post not found", 404));
    // Get a slice of the comments array based on pagination parameters
    const comments = post.comments.slice(skipComments, skipComments + Number(onePageLimit));
    // Respond with paginated comments and total comments count
    res.status(200).json({
        success: true,
        comments: comments,
        totalComments: post.comments.length,
    });
});
