import { isValidObjectId } from "mongoose";
import { CustomError, asyncHandler } from "../middlewares/asyncHandler.js";
import Event from "../models/eventsModel.js";
import { deleteFromBlackBlaze, uploadOnBlackBlaze } from "../utils/blackblaze-b2.js";

// -------------------------------------------
// http://localhost:4000/api/v1/events/reecnt
// -------------------------------------------
// GET ALL Event BY CATEGORY

export const getRecentEvents = asyncHandler(async (req, res, next) => {
    const { page = 1, onePageLimit = process.env.PRODUCT_PER_PAGE } = req.query;
    const skipProducts = onePageLimit * (page - 1);
    // 2. Fetch all gallery Events from that category
    const events = await Event.find({ endTime: { $lte: Date.now() } })
        .sort({ createdAt: -1 })
        .skip(skipProducts)
        .limit(onePageLimit)
        .select("-comments -attendence");
    if (!events) return next(new CustomError("Events not found for this category", 404));
    res.status(200).json({
        success: true,
        length: events.length,
        data: events,
    });
});
// -------------------------------------------
// http://localhost:4000/api/v1/events/upcomming
// -------------------------------------------
// GET ALL Event BY CATEGORY

export const getUpcommingEvents = asyncHandler(async (req, res, next) => {
    const { page = 1, onePageLimit = process.env.PRODUCT_PER_PAGE } = req.query;
    const skipProducts = onePageLimit * (page - 1);
    // 2. Fetch all gallery Events from that category
    const events = await Event.find({
        $or: [
            { startTime: { $lte: Date.now() }, endTime: { $gt: Date.now() } }, // ongoing events
            { startTime: { $gt: Date.now() } }, // upcoming events
        ],
    })
        .sort({ createdAt: -1 })
        .skip(skipProducts)
        .limit(onePageLimit)
        .select("-comments -attendence");
    if (!events) return next(new CustomError("Events not found for this category", 404));
    res.status(200).json({
        success: true,
        length: events.length,
        data: events,
    });
});

// ------------------------------------------
// http://localhost:4000/api/v1/events/create
// ------------------------------------------
// CREATE NEW Event

export const createNewEvent = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user) return next(new CustomError("User Not Found", 500));
    // 1. Destructure Data From Body
    let { title, latitude, longitude, startTime, endTime, liveUrl, allowComments, allowShares } = req.body;
    const file = req.file;
    // 2. Basic validation
    if (!title || !latitude || !longitude || !startTime || !file || !endTime)
        return next(new CustomError("Please Enter All Required Fields", 400));
    if (!file) return next(new CustomError("Please Enter Poster First", 400));
    // add file to blackblaze
    let poster = await uploadOnBlackBlaze(file);
    if (!poster) return next(new CustomError("Error While Uploading Poster On BlackBlaze", 400));
    // 3. Creating a  gallery Event
    let eventData = {
        ownerId: user._id,
        poster,
        title,
        startTime: new Date(startTime),
        location: { type: "Point", coordinates: [Number(latitude), Number(longitude)] },
    };
    if (liveUrl) eventData.liveUrl = liveUrl;
    if (endTime) eventData.endTime = new Date(endTime);
    if (allowComments == "yes") eventData.allowComments = true;
    if (allowComments == "no") eventData.allowComments = false;
    if (allowShares == "yes") eventData.allowShares = true;
    if (allowShares == "no") eventData.allowShares = false;
    const event = await Event.create(eventData);
    if (!event) {
        await deleteFromBlackBlaze(poster.fileId, poster.fileName);
        return next(new CustomError("Some Error Occurred during Event Creating", 500));
    }
    // 4. Send Response after creating a new gallery Event
    res.status(201).json({
        success: true,
        message: "Event Created Successfully",
    });
});

// --------------------------------------------------
// http://localhost:4000/api/v1/events/single/:eventId
// --------------------------------------------------
// Get, UPDATE, AND DELETE  Event

export const getSingleEvent = asyncHandler(async (req, res, next) => {
    // 1. Getting Event id from params and validate
    const { eventId } = req.params;
    if (!isValidObjectId(eventId)) {
        return next(new CustomError("Invalid Event ID", 400));
    }
    // 2. Fetching the Event from database
    const event = await Event.findById(eventId).select("-comments -attendence");
    if (!event) return next(new CustomError("Event Not Found", 404));
    // 3. Send Response
    res.status(201).json({
        success: true,
        event,
    });
});

export const deleteSingleEvent = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user) return next(new CustomError("User Not Found", 500));
    // 1. Getting Event id from params and validate
    const { eventId } = req.params;
    if (!isValidObjectId(eventId)) {
        return next(new CustomError("Invalid Event ID", 400));
    }
    // 2. Fetching the Event from database and delete if the owner is deleting
    const event = await Event.findByIdAndDelete({
        _id: eventId,
    });
    if (event) {
        const result = await deleteFromBlackBlaze(event.poster.fileId, event.poster.fileName);
        if (result) {
            console.log("Event Poster Deleted Successfully");
        } else {
            console.log("Error During Event Deletion");
        }
    }
    // 3. Send Response
    res.status(200).json({
        success: true,
        message: "Event Deleted Successfully",
    });
});

export const updateSingleEvent = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user) return next(new CustomError("User Not Found", 500));
    // 1. Getting Event id from params and validate
    const { eventId } = req.params;
    if (!isValidObjectId(eventId)) {
        return next(new CustomError("Invalid Event ID", 400));
    }
    // 2. Destructure Data from body
    const { title, longitude, latitude, startTime, endTime, liveUrl, mediaType, allowComments, allowShares } =
        req.body;
    const files = req.files;
    let images = [];
    let videos = [];
    // images and videos deference
    if (files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.mimetype.includes("image")) {
                images.push(file);
            } else if (file.mimetype.includes("video")) {
                videos.push(file);
            }
        }
    }
    if (!title && !longitude && !latitude && !startTime && !endTime && !liveUrl && !files) {
        return next(new CustomError("No data provided for update", 400));
    }
    if (files.length > 0 && !mediaType) return next(new CustomError("Please Enter Valid Media Type", 500));
    if (mediaType && !["data", "poster"].includes(mediaType)) {
        return next(new CustomError("Please Enter Valid Media Type", 500));
    }
    // 3. Fetch the Event From Database
    let event = await Event.findById(eventId);
    if (!event) return next(new CustomError("Event not found", 404));
    // update multi images on blackblaze and db
    if (images.length > 0 && mediaType == "data") {
        for (let i = 0; i < images.length; i++) {
            const file = images[i];
            const media = await uploadOnBlackBlaze(file);
            if (!media) return next(new CustomError("Error While Uploading Files On BlackBlaze", 400));
            // if (mediaType == "videos") event.Videos.push(media);
            event.images.push(media);
        }
    }
    // update multi videos on blackblaze and db
    if (videos.length > 0 && mediaType == "data") {
        for (let i = 0; i < videos.length; i++) {
            const file = videos[i];
            const media = await uploadOnBlackBlaze(file);
            if (!media) return next(new CustomError("Error While Uploading Files On BlackBlaze", 400));
            event.Videos.push(media);
        }
    }
    // update poster
    if (files && mediaType === "poster") {
        const media = await uploadOnBlackBlaze(files[0]);
        if (!media) return next(new CustomError("Error While Uploading Files On BlackBlaze", 400));
        // delete Old poster
        const result = await deleteFromBlackBlaze(event.poster.fileId, event.poster.fileName);
        if (result) console.log("Successfully Removed Old Poster");
        else console.log("Error During Removing Old Poster");
        event.poster = media;
    }
    // 4. Some Validations and Add Update data
    if (title && typeof title === "string") event.title = title.toLowerCase();
    if (startTime) event.startTime = new Date(startTime);
    if (endTime) event.endTime = new Date(endTime);
    if (allowComments == "yes") event.allowComments = true;
    if (allowComments == "no") event.allowComments = false;
    if (allowShares == "yes") event.allowShares = true;
    if (allowShares == "no") event.allowShares = false;
    if (liveUrl) event.liveUrl = liveUrl;
    if (longitude)
        event.location = { type: "Point", coordinates: [event.location.coordinates[0], longitude] };
    if (latitude) event.location = { type: "Point", coordinates: [latitude, event.location.coordinates[0]] };
    if (longitude && latitude) event.location = { type: "Point", coordinates: [latitude, longitude] };
    // 6. Update the Event and send Response
    let updatedEvent = await event.save();
    if (!updatedEvent) return next(new CustomError("Something Wrong While Updating Event", 500));
    // 7. Send Response
    res.status(200).json({
        success: true,
        message: "Event Updated Successfully",
    });
});

// -------------------------------------------------------
// http://localhost:4000/api/v1/events/event/like/:eventId
// -------------------------------------------------------
// like a  Event

export const LikeAEvent = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting Event id from params and validate
    const { eventId } = req.params;
    if (!isValidObjectId(eventId)) {
        return next(new CustomError("Invalid Event ID", 400));
    }
    // 2. Fetch  a gallery Event
    const event = await Event.findById(eventId).select("likes");
    if (!event) return next(new CustomError("Events not found", 404));
    // 3. check if user already like then dislike else like
    let alreadyLiked = event.likes.some((like) => like.toString() === userId.toString());
    if (alreadyLiked) {
        event.likes = event.likes.filter((id) => id.toString() !== userId.toString());
    } else {
        event.likes.push(userId);
    }
    // 4. save Event and send Response
    await event.save();
    res.status(200).json({
        success: true,
        message: alreadyLiked ? "Event Disliked Successfully" : "Event Liked Successfully",
    });
});

// --------------------------------------------------------
// http://localhost:4000/api/v1/events/event/comment/:eventId
// --------------------------------------------------------
// COMMENT on a  Event

export const commentAEvent = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting Event id from params and validate
    const { eventId } = req.params;
    if (!isValidObjectId(eventId)) return next(new CustomError("Invalid Event ID", 400));
    // 2. destructure content of comment from body
    const { content } = req.body;
    if (!content) return next(new CustomError("Please Enter a Valid Content for Comment", 400));
    // 3. Fetch Event and add comment
    const event = await Event.findById(eventId).select("comments allowComments");
    if (!event) {
        return next(new CustomError("Event not Found", 404));
    } else if (!event.allowComments) {
        return next(new CustomError("Comments are Off for This Event", 400));
    }
    event.comments.push({ ownerId: userId, content });
    // 4. save Event and send Response
    await event.changeCommentsCount();
    await event.save();
    res.status(201).json({
        success: true,
        message: "Comment Added Successfully",
    });
});
// ------------------------------------------------------
// http://localhost:4000/api/v1/events/event/share/:eventId
// ------------------------------------------------------
// share a Event

export const shareAEvent = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting Event id from params and validate
    const { eventId } = req.params;
    if (!isValidObjectId(eventId)) {
        return next(new CustomError("Invalid Event ID", 400));
    }
    // 2. Fetch Event and replied comment
    const event = await Event.findById(eventId).select("shares allowShares");
    if (!event) {
        return next(new CustomError("Event not Found", 404));
    } else if (!event.allowShares) {
        return next(new CustomError("Shares are Off for This Event", 400));
    }
    // 3. add one share in Event
    event.shares += 1;
    // 4. save Event and send Response
    await event.save();
    res.status(200).json({
        success: true,
        message: "Event Shared Successfully",
    });
});

// --------------------------------------------------------------------
// http://localhost:4000/api/v1/events/event/comments/:eventId/:commentId
// --------------------------------------------------------------------
// LIKE UPDATE AND DELETE COMMENT

export const updateEventComment = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting EventId from params and validate
    const { commentId, eventId } = req.params;
    if (!isValidObjectId(eventId) || !isValidObjectId(commentId)) {
        return next(new CustomError("Invalid Event or Comment ID", 400));
    }
    // 2. destructure content of comment from body
    const { content } = req.body;
    if (!content) return next(new CustomError("Please Add Content for Update", 400));
    // 3. Fetch Event and get the comment
    const event = await Event.findById(eventId);
    if (!event) return next(new CustomError("Event not found", 404));
    const comment = event.comments.find((comment) => String(comment._id) === String(commentId));
    // 4. Validate comment and check that this user is eligible to change this or not
    if (!comment) {
        return next(new CustomError("Comment Not Found", 404));
    } else if (String(comment.ownerId) !== String(userId)) {
        return next(new CustomError("Unauthorized to update this comment", 403));
    }
    // 5. Update Comment and save the Event with updated value
    comment.content = content;
    comment.updatedAt = Date.now();
    let newEvent = await event.save();
    if (!newEvent) return next(new CustomError("Error While Updating Comment"));
    // 6. Response
    res.status(200).json({
        success: true,
        message: "Comment Updated Successfully",
    });
});
export const deleteEventComment = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user) return next(new CustomError("User Not Found", 500));
    // 1. Getting EventId from params and validate
    const { eventId, commentId } = req.params;
    if (!isValidObjectId(eventId) || !isValidObjectId(commentId)) {
        return next(new CustomError("Invalid Event or Comment ID", 400));
    }
    // 3. Fetch Event and get the comment
    const event = await Event.findById(eventId).select("comments ownerId");
    if (!event) return next(new CustomError("Events not found", 404));
    const comment = event.comments.id(commentId);
    // 4. Validate comment and check that this user is eligible to change this or not
    if (!comment) {
        return next(new CustomError("Comment Not Found", 404));
    } else if (String(comment.ownerId) !== String(user._id) && user.role !== "admin") {
        return next(new CustomError("Unauthorized to Delete this Comment", 403));
    }
    // 5. Delete Comment and save the Event
    event.comments = event.comments.filter((comment) => comment._id.toString() != commentId.toString());
    const newEvent = await event.save();
    if (!newEvent) return next(new CustomError("Error While Deleting Comment"));
    // 6. Response
    res.status(200).json({
        success: true,
        message: "Comment Deleted Successfully",
    });
});

// ------------------------------------------------------------------------
// http://localhost:4000/api/v1/events/event/comments/like/:eventId/:commentId
// ------------------------------------------------------------------------
// LIKE A Event COMMENT

export const likeAEventComment = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting Event id from params and validate
    const { eventId, commentId } = req.params;
    if (!isValidObjectId(eventId) || !isValidObjectId(commentId)) {
        return next(new CustomError("Invalid Event or Comment ID", 400));
    }
    // 3. Fetch Event and get the comment
    const event = await Event.findById(eventId).select("comments");
    if (!Event) return next(new CustomError("Events not found", 404));
    const comment = event.comments.id(commentId);
    if (!comment) return next(new CustomError("Comment Not Found", 404));
    // 4. add a like in that comment
    const alreadyLiked = comment.likes.some((id) => String(id) === String(userId));
    if (alreadyLiked) {
        comment.likes = comment.likes.filter((id) => String(id) !== String(userId));
    } else {
        comment.likes.push(userId);
    }
    // 4. save Event and send Response
    await event.save();
    res.status(200).json({
        success: true,
        message: alreadyLiked ? "Comment Disliked Successfully" : "Comment LIked Successfully",
    });
});

// -------------------------------------------------------------------------
// http://localhost:4000/api/v1/events/event/comments/reply/:eventId/:commentId
// -------------------------------------------------------------------------
// Add a reply on gallery Event comment

export const AddReplyOnEventComment = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting Event id from params and validate
    const { eventId, commentId } = req.params;
    if (!isValidObjectId(eventId) || !isValidObjectId(commentId)) {
        return next(new CustomError("Invalid Event or Comment ID", 400));
    }
    // 2. destructure reply of comment from body
    const { reply } = req.body;
    if (!reply) return next(new CustomError("Please Enter a Valid Reply", 400));
    // 3. Fetch Event and replied comment and add a new reply
    const result = await Event.updateOne(
        { _id: eventId, "comments._id": commentId },
        {
            $push: { "comments.$.replies": { ownerId: userId, reply } },
            $inc: { commentsCount: 1 },
        }
    );
    if (result.modifiedCount === 0) return next(new CustomError("Event or Comment Not Found", 404));
    res.status(201).json({
        success: true,
        message: "Reply Added Successfully",
    });
});

// -------------------------------------------------------------------------------------
// http://localhost:4000/api/v1/gallery/Event/comments/replies/:EventId/:commentId/:replyId
// -------------------------------------------------------------------------------------
// like update and delete a gallery Event comment reply

export const AddLikeOnEventCommentReply = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting Event id from params and validate
    const { eventId, commentId, replyId } = req.params;
    if (!isValidObjectId(eventId) || !isValidObjectId(commentId) || !isValidObjectId(replyId)) {
        return next(new CustomError("Invalid Event, Comment, or Reply ID", 400));
    }
    // 2. Fetch Event and replied comment
    const event = await Event.findById(eventId).select("comments ownerId");
    if (!event) return next(new CustomError("Events not found", 404));
    // 3. get the target comment
    let comment = event.comments.id(commentId);
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
    // 5. save Event and send Response
    await event.save();
    res.status(200).json({
        success: true,
        message: alreadyLiked ? "Reply Disliked Successfully" : "Reply Liked Successfully",
    });
});
export const UpdateTheEventCommentReply = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting Event id from params and validate
    const { eventId, commentId, replyId } = req.params;
    if (!isValidObjectId(eventId) || !isValidObjectId(commentId) || !isValidObjectId(replyId)) {
        return next(new CustomError("Invalid Event, Comment, or Reply ID", 400));
    }
    // 2. destructure reply of comment from body
    const { reply } = req.body;
    if (!reply) return next(new CustomError("Please Enter a Valid Reply For Update", 400));
    // 3. Fetch Event and replied comment
    const event = await Event.findById(eventId).select("comments");
    if (!event) return next(new CustomError("Events not found", 404));
    // 4. get the target comment
    let comment = event.comments.id(commentId);
    if (!comment) return next(new CustomError("Comment Not Found", 404));
    // 5. get the target reply for update
    let replyForUpdate = comment.replies.id(replyId);
    if (!replyForUpdate) {
        return next(new CustomError("Reply Not Found", 400));
    } else if (String(replyForUpdate.ownerId) !== String(userId)) {
        return next(new CustomError("Unauthorized To Update The Reply", 403));
    }
    replyForUpdate.reply = reply;
    // 6. save Event and send Response
    await event.save();
    res.status(200).json({
        success: true,
        message: "Reply Updated Successfully",
    });
});
export const deleteTheEventCommentReply = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user) return next(new CustomError("User Not Found", 500));
    // 1. Getting Event id from params and validate
    const { eventId, commentId, replyId } = req.params;
    if (!isValidObjectId(eventId) || !isValidObjectId(commentId) || !isValidObjectId(replyId)) {
        return next(new CustomError("Invalid Event, Comment, or Reply ID", 400));
    }
    // 2. Fetch Event and replied comment
    const event = await Event.findById(eventId).select("comments ownerId");
    if (!event) return next(new CustomError("Events not found", 404));
    // 3. get the target comment
    let comment = event.comments.id(commentId);
    if (!comment) return next(new CustomError("Comment Not Found", 404));
    // 4. get the target reply check auth and delete
    let replyForDelete = comment.replies.id(replyId);
    if (!replyForDelete) {
        return next(new CustomError("Reply Not Found", 400));
    } else if (String(replyForDelete.ownerId) !== String(user._id) && user.role !== "admin") {
        return next(new CustomError("Unauthorized To Delete The Reply", 403));
    }
    await replyForDelete.deleteOne();
    // 5. save Event and send Response
    await event.save();
    res.status(200).json({
        success: true,
        message: "Reply Deleted Successfully",
    });
});

// ---------------------------------------------------------------
// http://localhost:4000/api/v1/events/event/allow/comment/:eventId
// ---------------------------------------------------------------
// CHANGE ALLOW COMMENTS

export const changeCommentAllow = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting event id from params and validate
    const { eventId } = req.params;
    if (!isValidObjectId(eventId)) {
        return next(new CustomError("Invalid event ID", 400));
    }
    // 3. Fetch event and replied comment and add a new reply
    const event = await Event.findById(eventId);
    if (!event) return next(new CustomError("event Not Found", 404));
    event.allowComments = !event.allowComments;
    await event.save();
    res.status(201).json({
        success: true,
        message: `${!event.allowComments ? "Comments Are Off Now" : "Comments Are On Now"} `,
    });
});

// ---------------------------------------------------------------
// http://localhost:4000/api/v1/events/event/allow/share/:eventId
// ---------------------------------------------------------------
// CHANGE ALLOW Share

export const changeShareAllow = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id is Not Found", 500));
    // 1. Getting post id from params and validate
    const { eventId } = req.params;
    if (!isValidObjectId(eventId)) {
        return next(new CustomError("Invalid Event ID", 400));
    }
    // 3. Fetch post and replied comment and add a new reply
    const event = await Event.findById(eventId).select("allowShares");
    if (!event) return next(new CustomError("Event Not Found", 404));
    event.allowShares = !event.allowShares;
    await event.save();
    res.status(201).json({
        success: true,
        message: `${!event.allowShares ? "Sharing Are Off Now" : "Sharing Are On Now"} `,
    });
});

// ---------------------------------------------------------------
// http://localhost:4000/api/v1/events/event/attendence/:eventId
// ---------------------------------------------------------------
// get All Joined Web Users

export const getAllJoinedAttendence = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    if (!isValidObjectId(eventId)) return next(new CustomError("Invalid Post Id", 400));
    const { page = 1, onePageLimit = 20 } = req.query;
    const skipComments = (page - 1) * onePageLimit;
    const event = await Event.findById(eventId)
        .select("attendence")
        .populate("attendence", "name username photo");
    if (!event) return next(new CustomError("Event not found", 404));
    // Get a slice of the comments array based on pagination parameters
    const attendence = event.attendence.slice(skipComments, skipComments + Number(onePageLimit));
    // Respond with paginated comments and total comments count
    res.status(200).json({
        success: true,
        attendence: attendence,
        totalComments: event.attendence?.length,
    });
});

// -----------------------------------------------------------
// http://localhost:4000/api/v1/events/event/comments/:eventId
// -----------------------------------------------------------
// get All Comments

export const getAllComments = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    if (!isValidObjectId(eventId)) return next(new CustomError("Invalid Post Id", 400));
    const { page = 1, onePageLimit = 20 } = req.query;
    const skipComments = (page - 1) * onePageLimit;
    const event = await Event.findById(eventId)
        .populate("comments.ownerId", "name username photo")
        .populate("comments.replies.ownerId", "name username photo");
    if (!event) return next(new CustomError("Event not found", 404));
    // Get a slice of the comments array based on pagination parameters
    const comments = event.comments.slice(skipComments, skipComments + Number(onePageLimit));
    // Respond with paginated comments and total comments count
    res.status(200).json({
        success: true,
        comments: comments,
        totalComments: event.comments.length,
    });
});
