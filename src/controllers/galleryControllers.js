import { isValidObjectId } from "mongoose";
import { CustomError, asyncHandler } from "../middlewares/asyncHandler.js";
import Gallery, { galleryCategories, newsTypeForGallery } from "../models/galleryModel.js";
import { deleteFromBlackBlaze, uploadOnBlackBlaze } from "../utils/blackblaze-b2.js";

// ------------------------------------------------------
// http://localhost:4000/api/v1/gallery/category/:category
// ------------------------------------------------------
// GET ALL POST BY CATEGORY

export const getPostByCategory = asyncHandler(async (req, res, next) => {
    // 1. Getting post category from params and validate
    const galleryCategory = req.params?.category;
    if (!galleryCategories.includes(galleryCategory) && galleryCategory !== "all") {
        return next(new CustomError("Please Enter a Valid Category", 400));
    }
    const { page = 1, onePageLimit = process.env.PRODUCT_PER_PAGE, search = "", newsType = "" } = req.query;
    const skipProducts = onePageLimit * (page - 1);
    if (newsType && !newsTypeForGallery.includes(newsType) && newsType !== "all") {
        return next(new CustomError("Invalid News Type", 400));
    }
    // base query for search
    const baseQuery = {};
    if (galleryCategory && galleryCategory !== "all") baseQuery.category = galleryCategory;
    if (search) baseQuery.title = { $regex: new RegExp(String(search), "i") };
    if (newsType && newsType !== "all") baseQuery.newsType = newsType;
    // 2. Fetch all gallery posts from that category
    const [posts, postsCount] = await Promise.all([
        Gallery.find(baseQuery).sort({ createdAt: -1 }).skip(skipProducts).limit(onePageLimit),
        Gallery.countDocuments(baseQuery),
    ]);
    if (!posts) return next(new CustomError("Posts not found", 404));
    const totalPages = Math.ceil(postsCount / onePageLimit);
    // 3. Send response
    res.status(200).json({
        success: true,
        length: posts.length,
        totalPages,
        data: posts,
    });
});

// ------------------------------------------
// http://localhost:4000/api/v1/gallery/create
// ------------------------------------------
// CREATE NEW gallery POST

export const createNewGalleryPost = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user) return next(new CustomError("User Not Found", 500));
    // 1. Destructure Data From Body
    let { title = "", category = "", newsType = "", youTubeUrl = "", allowComments, allowShares } = req.body;
    let media = false;
    const file = req.file;
    // 2. Basic validation using short-circuit evaluation
    if (!category || !title || !newsType) {
        return next(new CustomError("Please Enter All Required Fields", 400));
    }
    if (!galleryCategories.includes(category) || !newsTypeForGallery.includes(newsType)) {
        return next(new CustomError("Invalid News Type or Category", 400));
    }
    if (category == "video" && !youTubeUrl) {
        return next(new CustomError("Please Enter YouTube Url If u Want to Upload a Video Post", 400));
    }
    if (["image", "reel"].includes(category) && !file) {
        return next(new CustomError("You Can't Add This Post Without File", 400));
    }
    if (["image", "reel"].includes(category) && youTubeUrl) youTubeUrl = "";
    if (["image", "reel"].includes(category) && !file) {
        return next(new CustomError("Without File You Can't Post a Image or Reel", 400));
    }
    if (["image", "reel"].includes(category) && file) {
        media = await uploadOnBlackBlaze(file);
        if (!media) return next(new CustomError("Error While Uploading File", 500));
    }
    // 3. Creating a  gallery Post
    const galleryPostData = {
        ownerId: user._id,
        category,
        newsType,
        title: title.toLowerCase(),
    };
    if (allowComments == "yes") galleryPostData.allowComments = true;
    if (allowComments == "no") galleryPostData.allowComments = false;
    if (allowShares == "yes") galleryPostData.allowShares = true;
    if (allowShares == "no") galleryPostData.allowShares = false;
    if (media) galleryPostData.media = media;
    if (youTubeUrl) galleryPostData.youTubeUrl = youTubeUrl;
    const galleryPost = await Gallery.create(galleryPostData);
    if (!galleryPost) return next(new CustomError("Some Error Occurred during Post Creating", 500));
    // 4. Send Response after creating a new gallery Post
    res.status(201).json({
        success: true,
        message: "Post Created Successfully",
    });
});

// --------------------------------------------------
// http://localhost:4000/api/v1/gallery/single/:postId
// --------------------------------------------------
// Get, UPDATE, AND DELETE GALLERY POST

export const getSingleGalleryPost = asyncHandler(async (req, res, next) => {
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post ID", 400));
    }
    // 2. Fetching the post from database
    const post = await Gallery.findById(postId);
    if (!post) return next(new CustomError("Post Not Found", 404));
    // 3. Send Response
    res.status(200).json({
        success: true,
        post,
    });
});
export const deleteSingleGalleryPost = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user) return next(new CustomError("User Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post ID", 400));
    }
    if (user.role !== "admin" && user.role !== "postHandler") {
        return next(new CustomError("You are Not Authorized to Delete This Post"));
    }
    // 2. Fetching the post from database and delete if the owner is deleting
    const post = await Gallery.findByIdAndDelete({
        _id: postId,
    });
    if (post && post.media) {
        const result = await deleteFromBlackBlaze(post.media.fileId, post.media.fileName);
        if (result) {
            console.log("Old File from Gallery Deleted Successfully");
        } else {
            console.log("Error While Deleting File From Gallery");
        }
    }
    // 3. Send Response
    res.status(200).json({
        success: true,
        message: "Post Deleted Successfully",
    });
});
export const updateSingleGalleryPost = asyncHandler(async (req, res, next) => {
    console.log(req.body);
    const user = req.user;
    if (!user) return next(new CustomError("User Not Found", 500));
    if (user.role !== "admin" && user.role !== "postHandler")
        return next(new CustomError("Unauthorized For This Task", 401));
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post ID", 400));
    }
    // 2. Destructure Data from body
    let { title = "", category = "", newsType = "", youTubeUrl = "", allowComments, allowShares } = req.body;
    const file = req.file;
    let media = false;
    if (!title && !category && !file && !newsType && !allowComments && !allowShares)
        return next(new CustomError("No data provided for update", 400));
    if (category && !galleryCategories.includes(category))
        return next(new CustomError("Invalid Category", 400));
    if (newsType && !newsTypeForGallery.includes(newsType))
        return next(new CustomError("Invalid News Type", 400));
    // 3. Fetch the post and verify ownership
    const galleryPost = await Gallery.findById(postId);
    if (!galleryPost) return next(new CustomError("Post not found", 404));
    // 4. some validations
    if (["image", "reel"].includes(category) && !file) {
        return next(new CustomError("You Cannot Update This Category Without Passing File", 400));
    }
    if (category == "video" && !youTubeUrl)
        return next(new CustomError("Please Enter YouTube Url First", 400));
    if (category == "video" && youTubeUrl && galleryPost.media) {
        const result = await deleteFromBlackBlaze(galleryPost.media.fileId, galleryPost.media.fileName);
        if (result) {
            console.log("Old File Deleted While Updating");
            galleryPost.media = null;
            galleryPost.category = null;
        } else console.log("Error While Deleting Old File in Updating");
    }
    if (category !== "video" && file) {
        media = await uploadOnBlackBlaze(file);
        if (!media) return next(new CustomError("Error While Pushing File On BlackBlaze"));
    }
    if (media && galleryPost.media) {
        const result = await deleteFromBlackBlaze(galleryPost.media.fileId, galleryPost.media.fileName);
        if (result) {
            console.log("Old File Deleted While Updating");
            galleryPost.media = null;
            galleryPost.category = null;
        } else console.log("Error While Deleting Old File in Updating");
    }
    if (["image", "reel"].includes(category)) galleryPost.youTubeUrl = null;
    // 4. Some Validations and Add Update data
    if (title) galleryPost.title = title.toLowerCase();
    if (allowComments == "yes") galleryPost.allowComments = true;
    if (allowShares == "yes") galleryPost.allowShares = true;
    if (allowComments == "no") galleryPost.allowComments = false;
    if (allowShares == "no") galleryPost.allowShares = false;
    if (category) galleryPost.category = category;
    if (youTubeUrl && category == "video") galleryPost.youTubeUrl = youTubeUrl;
    if (youTubeUrl && galleryPost.category == "video") galleryPost.youTubeUrl = youTubeUrl;
    if (media && ["image", "reel"].includes(galleryPost.category)) galleryPost.media = media;
    if (media && ["image", "reel"].includes(category)) galleryPost.media = media;
    if (newsType) galleryPost.newsType = newsType;

    // 6. Update the post and send Response
    let updatedPost = await galleryPost.save();
    if (!updatedPost) {
        return next(new CustomError("Something Wrong While Updating Post", 500));
    }
    res.status(200).json({
        success: true,
        message: "Post Updated Successfully",
    });
});

// -------------------------------------------------------
// http://localhost:4000/api/v1/gallery/post/like/:postId
// -------------------------------------------------------
// like a gallery post

export const LikeAGalleryPost = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post ID", 400));
    }
    // 2. Fetch  a gallery post
    const galleryPost = await Gallery.findById(postId).select("likes");
    if (!galleryPost) return next(new CustomError("Posts not found", 404));
    // 3. check if user already like then dislike else like
    let alreadyLiked = galleryPost.likes.some((like) => like.toString() === userId.toString());
    if (alreadyLiked) {
        galleryPost.likes = galleryPost.likes.filter((id) => id.toString() !== userId.toString());
    } else {
        galleryPost.likes.push(userId);
    }
    // 4. save post and send Response
    await galleryPost.save();
    res.status(200).json({
        success: true,
        message: alreadyLiked ? "Post Disliked Successfully" : "Post Liked Successfully",
    });
});

// --------------------------------------------------------
// http://localhost:4000/api/v1/gallery/post/comment/:postId
// --------------------------------------------------------
// COMMENT on a gallery post

export const commentAGalleryPost = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) return next(new CustomError("Invalid Post ID", 400));
    // 2. destructure content of comment from body
    const { content } = req.body;
    if (!content) return next(new CustomError("Please Enter a Valid Content for Comment", 400));
    // 3. Fetch post and add comment
    const galleryPost = await Gallery.findById(postId).select("comments allowComments");
    if (!galleryPost) {
        return next(new CustomError("Posts not found", 404));
    } else if (!galleryPost.allowComments) {
        return next(new CustomError("Comments Not Allowed On This Post", 400));
    }
    galleryPost.comments.push({ ownerId: userId, content });
    // 4. save post and send Response
    await galleryPost.changeCommentsCount();
    await galleryPost.save();
    res.status(201).json({
        success: true,
        message: "Comment Added Successfully",
    });
});
// ------------------------------------------------------
// http://localhost:4000/api/v1/gallery/post/share/:postId
// ------------------------------------------------------
// share a gallery post

export const shareAGalleryPost = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post ID", 400));
    }
    // 2. Fetch post and replied comment
    const galleryPost = await Gallery.findById(postId).select("shares allowShares");
    if (!galleryPost) {
        return next(new CustomError("Posts not found", 404));
    } else if (galleryPost.allowShares === false) {
        return next(new CustomError("Sharing Not Allowed On This Post", 400));
    }
    // 3. add one share in post
    galleryPost.shares += 1;
    // 5. save post and send Response
    await galleryPost.save();
    res.status(200).json({
        success: true,
        message: "Post Shared Successfully",
    });
});

// --------------------------------------------------------------------
// http://localhost:4000/api/v1/gallery/post/comments/:postId/:commentId
// --------------------------------------------------------------------
// LIKE UPDATE AND DELETE COMMENT

export const updateGalleryPostComment = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting postId from params and validate
    const { commentId, postId } = req.params;
    if (!isValidObjectId(postId) || !isValidObjectId(commentId)) {
        return next(new CustomError("Invalid Post or Comment ID", 400));
    }
    // 2. destructure content of comment from body
    const { content } = req.body;
    if (!content) return next(new CustomError("Please Add Content for Update", 400));
    // 3. Fetch post and get the comment
    const galleryPost = await Gallery.findById(postId);
    if (!galleryPost) return next(new CustomError("Post not found", 404));
    const comment = galleryPost.comments.find((comment) => String(comment._id) === String(commentId));
    // 4. Validate comment and check that this user is eligible to change this or not
    if (!comment) {
        return next(new CustomError("Comment Not Found", 404));
    } else if (String(comment.ownerId) !== String(userId)) {
        return next(new CustomError("Unauthorized to update this comment", 403));
    }
    // 5. Update Comment and save the post with updated value
    comment.content = content;
    comment.updatedAt = Date.now();
    await post.changeCommentsCount();
    let newPost = await galleryPost.save();
    if (!newPost) return next(new CustomError("Error While Updating Comment"));
    // 6. Response
    res.status(200).json({
        success: true,
        message: "Comment Updated Successfully",
    });
});
export const deleteGalleryPostComment = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting postId from params and validate
    const { postId, commentId } = req.params;
    if (!isValidObjectId(postId) || !isValidObjectId(commentId)) {
        return next(new CustomError("Invalid Post or Comment ID", 400));
    }
    // 3. Fetch post and get the comment
    const post = await Gallery.findById(postId).select("comments ownerId");
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
    await post.changeCommentsCount();
    const newPost = await post.save();
    if (!newPost) return next(new CustomError("Error While Deleting Comment"));
    // 6. Response
    res.status(200).json({
        success: true,
        message: "Comment Deleted Successfully",
    });
});

// ------------------------------------------------------------------------
// http://localhost:4000/api/v1/gallery/post/comments/like/:postId/:commentId
// ------------------------------------------------------------------------
// LIKE A gallery post COMMENT

export const likeAGalleryComment = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId, commentId } = req.params;
    if (!isValidObjectId(postId) || !isValidObjectId(commentId)) {
        return next(new CustomError("Invalid Post or Comment ID", 400));
    }
    // 3. Fetch post and get the comment
    const post = await Gallery.findById(postId).select("comments");
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
    await post.changeCommentsCount();
    await post.save();
    res.status(200).json({
        success: true,
        message: alreadyLiked ? "Comment Disliked Successfully" : "Comment LIked Successfully",
    });
});

// -------------------------------------------------------------------------
// http://localhost:4000/api/v1/gallery/post/comments/reply/:postId/:commentId
// -------------------------------------------------------------------------
// Add a reply on gallery post comment

export const AddReplyOnGalleryComment = asyncHandler(async (req, res, next) => {
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
    const result = await Gallery.updateOne(
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
// http://localhost:4000/api/v1/gallery/post/comments/replies/:postId/:commentId/:replyId
// -------------------------------------------------------------------------------------
// like update and delete a gallery post comment reply

export const AddLikeOnGalleryPostCommentReply = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId, commentId, replyId } = req.params;
    if (!isValidObjectId(postId) || !isValidObjectId(commentId) || !isValidObjectId(replyId)) {
        return next(new CustomError("Invalid Post, Comment, or Reply ID", 400));
    }
    // 2. Fetch post and replied comment
    const post = await Gallery.findById(postId).select("comments ownerId");
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
export const UpdateTheGalleryPostCommentReply = asyncHandler(async (req, res, next) => {
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
    const post = await Gallery.findById(postId).select("comments");
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
    await post.changeCommentsCount();
    await post.save();
    res.status(200).json({
        success: true,
        message: "Reply Updated Successfully",
    });
});
export const deleteTheGalleryPostCommentReply = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { postId, commentId, replyId } = req.params;
    if (!isValidObjectId(postId) || !isValidObjectId(commentId) || !isValidObjectId(replyId)) {
        return next(new CustomError("Invalid Post, Comment, or Reply ID", 400));
    }
    // 2. Fetch post and replied comment
    const post = await Gallery.findById(postId).select("comments ownerId");
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
    await post.changeCommentsCount();
    await post.save();
    res.status(200).json({
        success: true,
        message: "Reply Deleted Successfully",
    });
});

// ---------------------------------------------------------------
// http://localhost:4000/api/v1/gallery/post/allow/comment/:postId
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
    const post = await Gallery.findById(postId);
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
// http://localhost:4000/api/v1/gallery/post/allow/share/:postId
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
    const post = await Gallery.findById(postId);
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

// ---------------------------------------------------------------
// http://localhost:4000/api/v1/gallery/post/all/comments/:postId
// ---------------------------------------------------------------
// GET ALL COMMENTS OF A POST

export const getAllCommentsOfAPost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    if (!isValidObjectId(postId)) return next(new CustomError("Invalid Post Id", 400));
    const { page = 1, onePageLimit = 20 } = req.query;
    const skipComments = (page - 1) * onePageLimit;
    // Use the aggregation framework to paginate comments
    const post = await Gallery.findById(postId)
        .populate("comments.ownerId", "name username photo")
        .populate("comments.replies.ownerId", "name username photo");
    if (!post) return next(new CustomError("Post not found", 404));
    // Get a slice of the comments array based on pagination parameters
    const comments = post.comments.slice(skipComments, skipComments + Number(onePageLimit));
    // Response with paginated comments and total comments count
    res.status(200).json({
        success: true,
        comments: comments,
        totalComments: post.commentsCount,
    });
});
