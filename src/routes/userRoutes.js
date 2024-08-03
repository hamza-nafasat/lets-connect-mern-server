import express from "express";
import {
    attendAEvent,
    banAUser,
    changeShowBadgesOnOff,
    changeShowPointsOnOff,
    createMyCsrfToken,
    deleteProfile,
    followAPerson,
    forgetPassword,
    getAllEventsUsersJoin,
    getAllReferredUsers,
    getMyProfile,
    getNewAccessToken,
    getSingleUserProfile,
    getUserFollowers,
    getUserFollowing,
    loginUser,
    logoutUser,
    profileReferredBy,
    registerNewUser,
    removeMyCsrfToken,
    resetPassword,
    searchUserForAdd,
    updateProfile,
} from "../controllers/userControllers.js";
import { isAuthenticated, isSupOrRepHandler } from "../middlewares/auth.js";
import {
    loginSanitizer,
    profileReferredBySanitizer,
    registerSanitizer,
    updateProfileSanitizer,
    validatorErrorHandler,
} from "../middlewares/expressValidator.js";
import { singleUpload } from "../middlewares/multer.js";

const app = express();

// REGISTER
app.post("/register", registerSanitizer, validatorErrorHandler, registerNewUser);

// LOGIN
app.post("/login", loginSanitizer, validatorErrorHandler, loginUser);

// LOGOUT
app.get("/logout", isAuthenticated, logoutUser);

// GET, UPDATE, DELETE PROFILE
app.route("/profile")
    .get(isAuthenticated, getMyProfile)
    .put(isAuthenticated, updateProfileSanitizer, validatorErrorHandler, singleUpload, updateProfile)
    .delete(isAuthenticated, deleteProfile);

// GET USER FOLLOWERS
app.get("/user/followers/:userId", isAuthenticated, getUserFollowers);

// GET USER FOLLOWERS
app.get("/user/following/:userId", isAuthenticated, getUserFollowing);

// get a single user
app.get("/user/:id", isAuthenticated, getSingleUserProfile);

// follow a user
app.put("/follow/:id", isAuthenticated, followAPerson);

// attend a event
app.post("/attend/:eventId", isAuthenticated, attendAEvent);

// Show points on off
app.put("/user/show/points", isAuthenticated, changeShowPointsOnOff);

// Show badges on off
app.put("/user/show/badges", isAuthenticated, changeShowBadgesOnOff);

// get all referred users
app.get("/user/referred/:userId", isAuthenticated, getAllReferredUsers);

// get all events user join
app.get("/user/events/:userId", isAuthenticated, getAllEventsUsersJoin);

// ban a user
app.put("/user/ban/:userId", isAuthenticated, isSupOrRepHandler, banAUser);

// no logic joined referral link
app.put(
    "/profile/referredBy",
    isAuthenticated,
    profileReferredBySanitizer,
    validatorErrorHandler,
    profileReferredBy
);

// remove my csrf token
app.post("/create/token", isAuthenticated, createMyCsrfToken);

// remove my csrf token
app.delete("/remove/token", isAuthenticated, removeMyCsrfToken);

// Search users
app.get("/search", isAuthenticated, searchUserForAdd);

app.put("/forget/password", isAuthenticated, forgetPassword);
app.put("/reset/password", isAuthenticated, resetPassword);

// get new access token
app.get("/access-token", getNewAccessToken);

export default app;
