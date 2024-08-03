import express from "express";
import { isAuthenticated, isSupOrPostHandler } from "../middlewares/auth.js";

import {
    AddLikeOnEventCommentReply,
    AddReplyOnEventComment,
    LikeAEvent,
    UpdateTheEventCommentReply,
    changeCommentAllow,
    changeShareAllow,
    commentAEvent,
    createNewEvent,
    deleteEventComment,
    deleteSingleEvent,
    deleteTheEventCommentReply,
    getAllComments,
    getAllJoinedAttendence,
    getRecentEvents,
    getSingleEvent,
    getUpcommingEvents,
    likeAEventComment,
    shareAEvent,
    updateEventComment,
    updateSingleEvent,
} from "../controllers/eventsControllers.js";
import {
    commentReplySanitizer,
    commentSanitizer,
    newEventSanitizer,
    paginationSanitizer,
    updateEventSanitizer,
    validatorErrorHandler,
} from "../middlewares/expressValidator.js";
import { multiUpload, singleUpload } from "../middlewares/multer.js";

const app = express();

// CREATE NEW event
app.post(
    "/create",
    isAuthenticated,
    isSupOrPostHandler,
    singleUpload,
    newEventSanitizer,
    validatorErrorHandler,
    createNewEvent
);

// GET, UPDATE, AND DELETE SINGLE event
app.route("/single/:eventId")
    .get(isAuthenticated, getSingleEvent)
    .delete(isAuthenticated, isSupOrPostHandler, deleteSingleEvent)
    .put(
        isAuthenticated,
        isSupOrPostHandler,
        multiUpload,
        updateEventSanitizer,
        validatorErrorHandler,
        updateSingleEvent
    );

// LIKE a  event
app.put("/event/like/:eventId", isAuthenticated, LikeAEvent);
// COMMENT on a  event
app.put("/event/comment/:eventId", isAuthenticated, commentSanitizer, validatorErrorHandler, commentAEvent);
// Share a  event
app.put("/event/share/:eventId", isAuthenticated, shareAEvent);

// UPDATE AND DELETE COMMENT
app.route("/event/comments/:eventId/:commentId")
    .put(isAuthenticated, commentSanitizer, validatorErrorHandler, updateEventComment)
    .delete(isAuthenticated, deleteEventComment);

// LIKE A COMMENT
app.put("/event/comments/like/:eventId/:commentId", isAuthenticated, likeAEventComment);

// REPLY A COMMENT
app.put(
    "/event/comments/reply/:eventId/:commentId",
    isAuthenticated,
    commentReplySanitizer,
    validatorErrorHandler,
    AddReplyOnEventComment
);

// ADD LIKE UPDATE AND DELETE A REPLY OF COMMENT
app.route("/event/comments/replies/:eventId/:commentId/:replyId")
    .post(isAuthenticated, AddLikeOnEventCommentReply)
    .put(isAuthenticated, commentReplySanitizer, validatorErrorHandler, UpdateTheEventCommentReply)
    .delete(isAuthenticated, deleteTheEventCommentReply);

// GET recent and upcomming event
app.get("/recent", isAuthenticated, paginationSanitizer, validatorErrorHandler, getRecentEvents);
app.get("/upcomming", isAuthenticated, paginationSanitizer, validatorErrorHandler, getUpcommingEvents);

// Change Comments Allow
app.put("/event/allow/comments/:eventId", isAuthenticated, isSupOrPostHandler, changeCommentAllow);

// Change shares Allow
app.put("/event/allow/shares/:eventId", isAuthenticated, isSupOrPostHandler, changeShareAllow);

// Get All Event Comments
app.get("/event/comments/:eventId", isAuthenticated, getAllComments);

// Get All attendence
app.get(
    "/event/attendence/:eventId",
    isAuthenticated,
    paginationSanitizer,
    validatorErrorHandler,
    getAllJoinedAttendence
);

export default app;
