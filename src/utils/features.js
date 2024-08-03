import crypto from "crypto";
import User from "../models/userModel.js";
import { validationResult } from "express-validator";
import { CustomError } from "../middlewares/asyncHandler.js";
import { redisClient } from "../../index.js";
import LiveToken from "../models/liveTokens.model.js";

// function for generating referral code which is unique
// ----------------------------------------------------
export const generateUniqueCode = async () => {
    const length = 15;
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz";
    let code;
    do {
        code = "";
        for (let i = 0; i < length; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
    } while (await User.exists({ referralCode: code }));
    return code;
};
// send jwt token to client
// -----------------------
export const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: process.env.NODE_ENV !== "development" ? "none" : "",
    maxAge: 15 * 24 * 60 * 60 * 1000,
};

export const sendJwtToken = async (res, user, message = "", statusCode = 200, isWeb = false, uniqueId) => {
    try {
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken(uniqueId);
        console.log(uniqueId, refreshToken);
        if (!accessToken || !refreshToken) throw new Error("Error generating Auth Tokens");
        if (isWeb) {
            const newUser = await User.findById(user._id).populate("referredBy");
            res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 1000 * 60 * 5 });
            res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 7 });
            res.status(statusCode).json({
                success: true,
                message,
                user: newUser,
            });
        } else {
            res.status(statusCode).json({
                success: true,
                message,
                accessToken,
                refreshToken,
            });
        }
    } catch (error) {
        console.error("Error generating JWT token:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Find Month Difference
// ---------------------

export const CheckMonthDifference = (today, creationDate) => {
    let monthDiff = today.getMonth() - creationDate.getMonth();
    let yearDiff = today.getFullYear() - creationDate.getFullYear();
    if (monthDiff < 0) {
        monthDiff += 12;
        yearDiff--;
    }
    return monthDiff + yearDiff * 12;
};
// update array according data fro charts
// --------------------------------------
export const UpdateArrayAccordingData = (data, arr) => {
    const today = new Date();
    for (let i = 0; i < data.length; i++) {
        const creationDate = data[i].createdAt;
        console.log(creationDate);
        if (!creationDate) return;
        const monthDiff = CheckMonthDifference(today, creationDate);
        arr[12 - monthDiff - 1] += 1;
    }
};
// get last year 12 month
// ----------------------
export const getLastYearMonths = () => {
    const months = [];
    const data = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    const remains = 11 - currentMonth;
    for (let i = currentMonth; i >= 0; i--) {
        months.unshift(data[i]);
    }
    for (let i = remains; i > 0; i--) {
        months.unshift(data[currentMonth + i]);
    }
    return months;
};
//get lock time dynamically for locked user while login
// ----------------------------------------------------
export const getUnlockTimeMessage = (lockUntil) => {
    const currentTime = Date.now();
    const lockDuration = lockUntil - currentTime;
    const seconds = Math.floor((lockDuration / 1000) % 60);
    const minutes = Math.floor((lockDuration / (1000 * 60)) % 60);
    const hours = Math.floor((lockDuration / (1000 * 60 * 60)) % 24);
    let message = "Your account is temporarily locked.";
    if (hours > 0) {
        message += ` It will be unlocked in ${hours} hour${hours > 1 ? "s" : ""}`;
        if (minutes > 0 || seconds > 0) {
            message += ` ${minutes} minute${minutes > 1 ? "s" : ""}`;
        }
    } else if (minutes > 0) {
        message += ` It will be automatically unlocked in ${minutes} minute${minutes > 1 ? "s" : ""}`;
    }
    if (seconds > 0) {
        message += ` ${seconds} second${seconds > 1 ? "s" : ""}`;
    }
    message += ".";
    return message;
};

// generate a random scrfToken and store this token in session storage
// -------------------------------------------------------------------
export const generateRandomScrfToken = (req) => {
    let returnedToken;
    if (!req.session.csrfToken) {
        const csrfToken = {
            value: crypto.randomBytes(32).toString("hex"),
            expires: Date.now() + 3600000 * 24,
        };
        req.session.csrfToken = csrfToken;
        returnedToken = csrfToken;
    } else {
        console.log("old", req.session.csrfToken);
        delete req.session.csrfToken;
        const newCsrfToken = {
            value: crypto.randomBytes(32).toString("hex"),
            expires: Date.now() + 3600000 * 24,
        };
        req.session.csrfToken = newCsrfToken;
        returnedToken = newCsrfToken;
        console.log("new", req.session.csrfToken);
    }
    return returnedToken;
};
// remove csrf token and destroy session storage
// ---------------------------------------------
export const removeCsTokenAndDestroySession = (req) => {
    // remove token from session
    if (req.session.csrfToken) {
        delete req.session.csrfToken;
    }
    // destroy session while user logout
    req.session.destroy((err) => {
        if (err) return next(new CustomError("Something Wrong While Destroying Session", 500));
    });
};
// invalidateRedisCash function
// ----------------------------
export const invalidateRedisCash = async ({
    isUsers = false,
    userId = "",
    userFollowersFollowingId = "",
    userReferredId = "",
    userEventAttendId = "",
}) => {
    try {
        const cacheKeys = [];
        // invalidate users cashes
        if (isUsers) {
            cacheKeys.push("all:users:data");
            if (userId) {
                cacheKeys.push(`myProfile:${userId}`);
                cacheKeys.push(`singleUser:${userId}`);
            }
            if (userFollowersFollowingId) {
                cacheKeys.push(`user-followers:${userFollowersFollowingId}`);
                cacheKeys.push(`user-followings:${userFollowersFollowingId}`);
            }
            if (userReferredId) {
                cacheKeys.push(`user-referred:${userReferredId}`);
            }
            if (userEventAttendId) {
                cacheKeys.push(`user-events-attend:${userEventAttendId}`);
            }
        }
        if (cacheKeys.length > 0) {
            console.log(cacheKeys, "cacheKeys");
            await redisClient.del(cacheKeys);
        }
        return true;
    } catch (error) {
        console.log("Error while invalidating redis cache", error);
        return false;
    }
};
