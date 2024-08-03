import express from "express";
import {
    createANotification,
    deleteNotification,
    getMyLatestNotifications,
    markAsRead,
} from "../controllers/notificationController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import {
    newNotificationSanitizer,
    paginationSanitizer,
    validatorErrorHandler,
} from "../middlewares/expressValidator.js";

const app = express();

// create a notification
app.post("/create", isAuthenticated, newNotificationSanitizer, validatorErrorHandler, createANotification);

// get my latest notifications
app.get("/my", isAuthenticated, paginationSanitizer, validatorErrorHandler, getMyLatestNotifications);

// Route to mark a notification as read and delete it
app.route("/single/:notificationId")
    .put(isAuthenticated, markAsRead)
    .delete(isAuthenticated, deleteNotification);

export default app;
