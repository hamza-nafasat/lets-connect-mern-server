import { isValidObjectId } from "mongoose";
import { CustomError, asyncHandler } from "../middlewares/asyncHandler.js";
import Notification, { notificationTypes } from "../models/notificationModel.js";

// -------------------------------------------------
// http://localhost:4000/api/v1/notifications/create
// -------------------------------------------------
// Create a notification

export const createANotification = asyncHandler(async (req, res, next) => {
    // 1. destructure data from body
    const { type, fromUser, toUser, message, postId = "" } = req.body;
    // 2. validation for data
    if (!type || !fromUser || !toUser || !message) {
        return next(new CustomError("Please Enter All Required Fields", 400));
    }
    if (!isValidObjectId(fromUser) || !isValidObjectId(toUser)) {
        return next(new CustomError("Invalid from or to user Id", 400));
    }
    if (postId && !isValidObjectId(postId)) {
        return next(new CustomError("Invalid Post Id", 400));
    }
    if (!notificationTypes.includes(type)) {
        return next(new CustomError("Invalid Notification Type", 400));
    }
    if (["like", "comment"].includes(type) && !postId) {
        return next(new CustomError("Please Enter Post Id First", 400));
    }
    // 3. Add a notification
    let notificationData = { fromUser, toUser, type, message };
    if (postId) notificationData.postId = postId;
    const notification = await Notification.create(notificationData);
    if (!notification) {
        return next(new CustomError("Error While Creating Notification", 500));
    }
    // 4. send response
    res.status(201).json({
        success: true,
        message: "Notification Created Successfully",
    });
});

// -------------------------------------------------
// http://localhost:4000/api/v1/notifications/create
// -------------------------------------------------
// Create a notification

export const getMyLatestNotifications = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    // 1. destructure data from body
    const { page = 1, onePageLimit = parseInt((process.env.PRODUCT_PER_PAGE = 20)) } = req.query;
    const skipProducts = onePageLimit * (page - 1);
    // 2. validation for data
    const notifications = await Notification.find({ toUser: userId })
        .sort({ createdAt: -1 })
        .skip(skipProducts)
        .limit(onePageLimit);
    // 4. send response
    res.status(200).json({
        success: true,
        notifications,
    });
});

// -----------------------------------------------------------------
// http://localhost:4000/api/v1/notifications/single/:notificationId
// -----------------------------------------------------------------
// Mark as Read Notification

export const markAsRead = asyncHandler(async (req, res, next) => {
    const { notificationId } = req.params;
    if (!isValidObjectId(notificationId)) {
        return next(new CustomError("Invalid Notification Id", 400));
    }
    const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { isRead: true, readAt: Date.now() },
        { new: true }
    );
    if (!notification) {
        return next(new CustomError("Error While Reading Notification", 500));
    }
    res.status(200).json({
        success: true,
        message: "Notification Successfully Mark as Read",
    });
});
// -----------------------------------------------------------------
// http://localhost:4000/api/v1/notifications/single/:notificationId
// -----------------------------------------------------------------
// Delete a Notification

export const deleteNotification = asyncHandler(async (req, res, next) => {
    const { notificationId } = req.params;
    if (!isValidObjectId(notificationId)) {
        return next(new CustomError("Invalid Notification Id", 400));
    }
    const notification = await Notification.findByIdAndDelete(notificationId);
    if (!notification) {
        return next(new CustomError("Error While Deleting Notification", 500));
    }
    res.status(200).json({
        success: true,
        message: "Notification Deleted Successfully",
    });
});
