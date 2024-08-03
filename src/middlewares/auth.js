import User from "../models/userModel.js";
import { decryptPayload } from "../utils/secure.js";
import { CustomError, asyncHandler } from "./asyncHandler.js";
import jwt from "jsonwebtoken";

// only auth user middleware
export const isAuthenticated = asyncHandler(async (req, res, next) => {
    let accessToken = req.headers["access-token"];
    if (!accessToken) accessToken = req.cookies?.accessToken;
    if (!accessToken) return next(new CustomError("Invalid or Expired Access Token", 401));
    // decrypt token
    const decryptedToken = await decryptPayload(accessToken);
    // verify token is expired or not
    const decoded = jwt.verify(decryptedToken, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded) return next(new CustomError("Invalid or Expired Access Token", 401));
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) return next(new CustomError("Invalid or Expired Access Token", 401));
    let decodedToken = jwt.verify(decryptedToken, secret);
    if (!decodedToken) return next(new CustomError("Invalid or Expired Access Token", 401));
    const user = await User.findById(decodedToken._id).select("name isBanned role");
    if (!user) return next(new CustomError("User Not Found", 404));
    req.user = user;
    next();
});
// only admin middleware
export const isAdmin = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (user.role !== "admin") {
        return next(new CustomError("Only Admin Can Do This", 401));
    }
    next();
});
// all admins do this
export const isAllAdmins = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!(user.role === "admin" || user.role === "postHandler" || user.role === "reportHandler")) {
        return next(new CustomError("Only Admins Can Do This", 401));
    }
    next();
});
// only admin or reportHandler middleware
export const isSupOrRepHandler = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (user.role !== "admin" && user.role !== "reportHandler") {
        return next(new CustomError("Only Supper Admin or Report Handler Team Can Do This", 401));
    }
    next();
});
// only admin or postHandler middleware
export const isSupOrPostHandler = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (user.role !== "admin" && user.role !== "postHandler") {
        return next(new CustomError("Only Supper Admin or Post Handler Team Can Do This", 401));
    }
    next();
});
// isValid csrf token
export const isValidCsrfToken = (req, res, next) => {
    const token = req.session.csrfToken;
    const receivedToken = req.query._csrf;
    if (!token || !receivedToken || token !== receivedToken) {
        return next(new CustomError("Invalid CSRF TOKEN", 403));
    }
    const now = new Date().getTime();
    if (now > req.session.csrfTokenExpires) {
        return next(new CustomError("CSRF token has expired", 403));
    }
    next();
};
