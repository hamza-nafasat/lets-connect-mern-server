import jwt from "jsonwebtoken";
import { isValidObjectId } from "mongoose";
import twilio from "twilio";
import { asyncHandler, CustomError } from "../middlewares/asyncHandler.js";
import { DeletedUser } from "../models/deletedUserModel.js";
import Event from "../models/eventsModel.js";
import LiveToken from "../models/liveTokens.model.js";
import User from "../models/userModel.js";
import { deleteFromBlackBlaze, uploadOnBlackBlaze } from "../utils/blackblaze-b2.js";
import {
    generateRandomScrfToken,
    getUnlockTimeMessage,
    removeCsTokenAndDestroySession,
    sendJwtToken,
} from "../utils/features.js";
import { decryptPayload } from "../utils/secure.js";

// ---------------------------invalidate-----------------------------
// http://localhost:4000/api/v1/users/register  New user registration
// ------------------------------------------------------------------

export const registerNewUser = asyncHandler(async (req, res, next) => {
    // 1. Destructure Data We Are Getting From Body
    let {
        name,
        username,
        email,
        password,
        gender,
        phoneNumber,
        referredBy,
        isWeb = false,
        uniqueId,
    } = req.body;
    if (!name || !username || !email || !password || !gender || !phoneNumber) {
        return next(new CustomError("Please Provide All Fields", 400));
    }
    if (!isWeb) uniqueId = req.headers["unique-id"];
    if (!uniqueId) return next(new CustomError("Unexpected Error", 400));
    // 2. Unique Field Checks using Mongoose Query Optimization
    const [existingPhone, existingEmail, existingUsername] = await Promise.all([
        User.exists({ phoneNumber }),
        User.exists({ email }),
        User.exists({ username }),
    ]);
    if (existingUsername) return next(new CustomError("Enter a unique username", 409));
    if (existingEmail) return next(new CustomError("Email already in use", 409));
    if (existingPhone) return next(new CustomError("Phone number already in use", 409));
    // 3. Creating a new user in database
    const newUserData = {
        name,
        username,
        email,
        gender,
        password,
        phoneNumber,
        photo: {
            url: "https://f005.backblazeb2.com/file/lets-connect-2024/no%20profile.webp-540887db-d162-431a-8a0f-52b0bb176d25.webp",
            fileName: "default",
            fileId: "default",
        },
    };
    if (referredBy) {
        const isExistReferredBy = await User.exists({
            referralCode: referredBy,
        });
        if (!isExistReferredBy) return next(new CustomError("Please Enter a Correct Referral Code", 400));
        newUserData.referredBy = referredBy;
        // del the cashes of referral code user
        // await invalidateRedisCash({
        //     isUsers: true,
        //     userId: isExistReferredBy._id,
        //     userReferredId: isExistReferredBy._id,
        // });
    }
    const user = await User.create(newUserData);
    if (!user) return next(new CustomError("User Not Found", 404));
    // 4. Response with jwt token
    sendJwtToken(res, user, "User created successfully", 201, isWeb, uniqueId);
});

// ------------------------------------------------------------------
// http://localhost:4000/api/v1/users/login  User Login Function
// ------------------------------------------------------------------

export const loginUser = asyncHandler(async (req, res, next) => {
    let { password, phoneNumber, isWeb = false, uniqueId } = req.body;
    if (!password || !phoneNumber) return next(new CustomError("Incorrect Password or Number", 400));
    if (!uniqueId) uniqueId = req.headers["unique-id"];
    if (!uniqueId) return next(new CustomError("Unexpected Error", 400));
    let user = await User.findOne({ phoneNumber }).select(
        "password isBanned isActive name loginAttempts lockUntil role refreshTokens"
    );
    if (!user) {
        return next(new CustomError("You need to create a new account", 404));
    }
    // else if (user.isBanned) {
    //     return next(new CustomError("You Are Banned", 403));
    // } else if (!user.isActive) {
    //     return next(new CustomError("Your account has been deactivated", 400));
    // }
    else if (user.lockUntil && user.lockUntil > Date.now()) {
        const lockMessageWithTime = getUnlockTimeMessage(user.lockUntil);
        return next(new CustomError(lockMessageWithTime, 400));
    } else if (
        isWeb &&
        !(user.role === "admin" || user.role === "reportHandler" || user.role === "postHandler")
    ) {
        return next(new CustomError("You are not authorized to login here", 403));
    }
    // 4. Checking the password is correct and User Security
    const isMatchPassword = await user.comparePassword(password);
    // 5. if password not match then do this action
    if (!isMatchPassword) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= process.env.USER_MAX_LOGIN_ATTEMPTS)
            user.lockUntil = Date.now() + Number(process.env.USER_LOCK_TIME);
        await user.save();
        return next(new CustomError("Incorrect Password or Number", 401));
    }
    // 6. if password match then do this action
    if (isMatchPassword && user.loginAttempts > 0) {
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
    }
    // 7. last login update
    await User.login(user._id);
    // 9. Response with jwt token
    sendJwtToken(res, user, `Welcome back ${user.name}`, 200, isWeb, uniqueId);
});

// ------------------------------------------------------------------
// http://localhost:4000/api/v1/users/logout  User logout Function
// ------------------------------------------------------------------

export const logoutUser = asyncHandler(async (req, res, next) => {
    const { accessToken, refreshToken } = req.cookies;
    const { uniqueId } = req.query;
    if (accessToken) {
        res.cookie("accessToken", "", {
            expires: new Date(Date.now()),
            httpOnly: true,
        });
    }
    if (refreshToken) {
        res.cookie("refreshToken", "", {
            expires: new Date(Date.now()),
            httpOnly: true,
        });
        const user = await User.findOne({
            refreshTokens: {
                $elemMatch: {
                    uniqueId: uniqueId,
                },
            },
        }).select("refreshTokens");
        if (user) {
            user.refreshTokens = user.refreshTokens.filter((doc) => doc.uniqueId != uniqueId);
            await user.save();
        }
    }
    // send response
    res.status(200).json({
        success: true,
        message: "Logged out Successfully",
    });
});

// --------------Redis Caching and invalidates-------------------
// http://localhost:4000/api/v1/users/profile  All Profile Routes
// --------------------------------------------------------------

export const getMyProfile = asyncHandler(async (req, res, next) => {
    const { isWeb } = req.query;
    const userId = req.user._id;
    let user = await User.findById(userId).populate("referredBy", "username");
    if (!user) return next(new CustomError("User Not Found", 404));
    if (isWeb && !(user.role === "admin" || user.role === "reportHandler" || user.role === "postHandler")) {
        return next(new CustomError("You are not authorized to login here", 403));
    }
    if (user.referredBy) {
        const referredByUser = await User.findOne({
            referralCode: user.referredBy,
        }).select("username");
        if (referredByUser) user.referredBy = referredByUser.username;
        else user.referredBy = "username";
    }
    res.status(200).json({ success: true, user });
});

export const updateProfile = asyncHandler(async (req, res, next) => {
    // 1. Getting data which user want to update
    const { name = "", username = "", bio = "", showBadges = "", showPoints = "", gender } = req.body;
    const file = req.file;
    if (!name && !username && !file && !bio && !showBadges && !showPoints && !gender) {
        return next(new CustomError("First Enter What You Want To Update", 400));
    }
    // 2. Getting the user directly bcz this is  Authentic User
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
        return next(new CustomError("User Not Found", 500));
    }
    // 3. updating data according what we received
    if (name) {
        user.name = name;
    }
    if (username) {
        // checking the username uniqueness
        const existingUsername = await User.exists({ username });
        if (existingUsername) {
            return next(new CustomError("Enter a unique username", 400));
        }
        user.username = username;
    }
    if (file) {
        if (user.photo) {
            let fileId = user.photo.fileId;
            let fileName = user.photo.fileName;
            if (!fileId || !fileName)
                return next(new CustomError("FileName And FileId Are Not Found In Update User", 404));
            const result = await deleteFromBlackBlaze(fileId, fileName);
            if (result) {
                console.log("file Deleted Successfully");
            }
        }
        const result = await uploadOnBlackBlaze(file);
        user.photo = {
            fileName: result.fileName,
            fileId: result.fileId,
            url: result.url,
        };
    }
    if (bio) user.bio = bio;
    if (showBadges == "yes") user.showBadges = true;
    if (showBadges == "no") user.showBadges = false;
    if (showPoints == "yes") user.showPoints = true;
    if (showPoints == "no") user.showPoints = false;
    if (gender) user.gender = gender;
    await user.save();
    // 4. invalidating redis cache
    // const isInvalidate = await invalidateRedisCash({ isUsers: true, userId: userId });
    // if (!isInvalidate) return next(new CustomError("Error while invalidating redis cache", 500));
    // 5. Response
    res.status(200).json({
        success: true,
        message: "User Updated Successfully",
    });
});

export const deleteProfile = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    if (!userId) return next(new CustomError("User Id Not Found", 500));
    // 1. Find the user
    const user = await User.findById(userId);
    if (!user) return next(new CustomError("User Not Found", 404));
    if (user.isBanned) return next(new CustomError("You Are Banned", 403));
    // send user in deleted users
    const deletedNewUser = await DeletedUser.create({
        isBanned: user.isBanned,
        name: user.name,
        username: user.username,
        role: user.role,
        email: user.email,
        password: user.password,
        phoneNumber: user.phoneNumber,
        followers: user.followers,
        following: user.following,
        badges: user.badges,
        bio: user.bio,
        points: user.points,
        referredUsers: user.referredUsers,
        referralPointsEarned: user.referralPointsEarned,
        isVerified: user.isVerified,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        eventsAttend: user.eventsAttend,
        userCreated: user.createdAt,
        userUpdated: user.updatedAt,
        photo: user.photo,
        referredBy: user.referredBy,
        referralCode: user.referralCode,
        isBanned: user.isBanned,
        loginAttempts: user.loginAttempts,
        posts: user.posts,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        joinedEventsCount: user.joinedEventsCount,
        referralCount: user.referralCount,
        showBadges: user.showBadges,
        showPoints: user.showPoints,
        userId: user._id,
        lockUntil: user.lockUntil,
    });
    if (!deletedNewUser) return next(new CustomError("Error while creating deleted user", 500));
    // 2. Delete user account
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) return next(new CustomError("Error during deleting user account", 500));
    // if (deletedUser.photo) {
    //     let result = await deleteFromBlackBlaze(deletedUser.photo.fileId, deletedUser.photo.fileName);
    //     if (!result) console.log("error while deleting file from blackblaze");
    // }
    // 3. Find the user and get their followers and following lists
    const { followers, following, referredUsers } = deletedUser;
    await User.updateMany({ _id: { $in: followers } }, { $pull: { following: userId } });
    await User.updateMany({ _id: { $in: following } }, { $pull: { followers: userId } });
    // 4. invalidating redis cache
    // const isInvalidate = await invalidateRedisCash({ isUsers: true, userId: userId });
    // if (!isInvalidate) return next(new CustomError("Error while invalidating redis cache", 500));
    // 5. Response
    res.status(200).json({
        success: true,
        message: "User Deleted Successfully",
    });
});

// ----------------- Redis caching -------------
// http://localhost:4000/api/v1/users/user/:id
// ---------------------------------------------
// get single user profile

export const getSingleUserProfile = asyncHandler(async (req, res, next) => {
    const myId = req.user._id;
    if (!myId) return next(new CustomError("UserId Not Found", 400));
    const { id } = req.params;
    if (!isValidObjectId(id)) return next(new CustomError("Invalid User Id", 400));
    let userForGet = await User.findById(id).select("-badges -referredUsers -eventsAttend");
    if (!userForGet) return next(new CustomError("User Not Found", 404));
    let meInUserFollowers = await User.exists({ _id: id, followers: myId });
    if (meInUserFollowers) meInUserFollowers = true;
    else meInUserFollowers = false;
    // 2. Response
    res.status(200).json({
        success: true,
        user: userForGet,
        meInUserFollowers,
    });
});

// -------------------------invalidate ----------
// http://localhost:4000/api/v1/users/followe/:id
// ---------------------------------------------
// follow a person

export const followAPerson = asyncHandler(async (req, res, next) => {
    // 1. Getting the user directly bcz this is  Authentic User
    const { _id } = req.user;
    const user = await User.findById(_id).select("following followers");
    if (!user) return next(new CustomError("User Not Found", 500));
    const { id } = req.params;
    if (!isValidObjectId(id)) return next(new CustomError("Invalid User Id", 400));
    if (String(id) === String(_id)) return next(new CustomError("You Can Not Follow Yourself"));
    // 2. checking is user exist
    const userForFollow = await User.findById(id).select("following followers");
    if (!userForFollow) return next(new CustomError("User Not Found", 400));
    const isAlreadyFollow = userForFollow.followers.some((userId) => String(userId) === String(_id));
    if (isAlreadyFollow) {
        userForFollow.followers = userForFollow.followers.filter((userId) => String(userId) !== String(_id));
        user.following = user.following.filter((userId) => String(userId) !== String(id));
    } else {
        user.following.push(id);
        userForFollow.followers.push(user._id);
    }
    await user.save();
    await userForFollow.save();
    // await invalidateRedisCash({ isUsers: true, userId: _id, userFollowersFollowingId: _id });
    // 3. Response
    res.status(200).json({
        success: true,
        message: !isAlreadyFollow ? "Followed Successfully" : "Unfollowed Successfully",
    });
});

// -------------------------invalidate --------------
// http://localhost:4000/api/v1/users/attend/:eventId
// --------------------------------------------------
// ADD ME IN THIS EVENT

export const attendAEvent = asyncHandler(async (req, res, next) => {
    const { _id } = req.user;
    const user = await User.findById(_id).select("name eventsAttend");
    if (!user) return next(new CustomError("User Not Found", 500));
    const { eventId } = req.params;
    if (!isValidObjectId(eventId)) return next(new CustomError("Invalid User Id", 400));
    // checking is event Exist
    const event = await Event.findById(eventId).select("endTime attendence");
    if (!event) {
        return next(new CustomError("Event Not Found or InCorrect Event Id", 400));
    } else if (event.endTime.getTime() < new Date().getTime()) {
        return next(new CustomError("This Event Time is End Now", 400));
    }
    // check is user already in this event add
    const isExist = event.attendence.some((obj) => String(obj.userId) == String(_id));
    if (isExist) return next(new CustomError("You Are Already Added In This Event", 400));
    // add user in event
    event.attendence.push({ userId: _id, createdAt: new Date() });
    await event.save();
    user.eventsAttend.push({ eventId: eventId });
    await user.save();
    // invalidate cash from redis
    // await invalidateRedisCash({ isUsers: true, userId: _id, userEventAttendId: _id });
    //  Response
    res.status(201).json({
        success: true,
        message: "Congratulations You Are Successfully Added In This Event",
    });
});

// -------------------------Redis Caching--------------------
// http://localhost:4000/api/v1/users/user/followers/:userId
// ----------------------------------------------------------
// Get user followers

export const getUserFollowers = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) return next(new CustomError("Invalid User Id", 400));

    // making a redis key and cash data
    const redisKey = `user-followers:${userId}`;
    let userWithFollowers;
    // if (await redisClient.exists(redisKey)) {
    //     userWithFollowers = JSON.parse(await redisClient.get(redisKey));
    // } else {
    userWithFollowers = await User.findById(userId)
        .select("followers name followersCount")
        .populate("followers", "name username photo");
    // send in redis
    //     await redisClient.set(redisKey, JSON.stringify(userWithFollowers));
    // }
    // Response
    res.status(201).json({
        success: true,
        user: userWithFollowers,
    });
});

// -------------------------Redis Caching--------------------
// http://localhost:4000/api/v1/users/user/following/:userId
// ----------------------------------------------------------
// Get user following

export const getUserFollowing = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) return next(new CustomError("Invalid User Id", 400));

    // making a redis key and cash data
    const redisKey = `user-followings:${userId}`;
    let userWithFollowing;
    // if (await redisClient.exists(redisKey)) {
    //     userWithFollowing = JSON.parse(await redisClient.get(redisKey));
    // } else {
    userWithFollowing = await User.findById(userId)
        .select("following name followingCount")
        .populate("following", "name username photo");
    // send in redis
    //     await redisClient.set(redisKey, JSON.stringify(userWithFollowing));
    // }
    // 2. Response
    res.status(201).json({
        success: true,
        user: userWithFollowing,
    });
});

// -----------------------invalidate-------------------
// http://localhost:4000/api/v1/users/user/show/points
// ---------------------------------------------------
// Show Points On Off

export const changeShowPointsOnOff = asyncHandler(async (req, res, next) => {
    const { _id } = req.user;
    if (!_id) next(new CustomError("User iD Not Found For Authentic User", 500));
    // 1 get user
    const user = await User.findById(_id).select("showPoints");
    user.showPoints = !user.showPoints;
    await user.save();
    // invalidate cash from redis
    // await invalidateRedisCash({ isUsers: true, userId: _id });
    // 2. Response
    res.status(201).json({
        success: true,
        message: user.showPoints ? "Show Points On Successfully" : "ShowPoints Off SuccessFully",
    });
});

// ---------------------------------------------------
// http://localhost:4000/api/v1/users/user/show/badges
// ---------------------------------------------------
// Show Badges On Off

export const changeShowBadgesOnOff = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    if (!userId) next(new CustomError("User iD Not Found For Authentic User", 500));
    // 1 get user
    const user = await User.findById(userId).select("showBadges");
    user.showBadges = !user.showBadges;
    await user.save();
    // invalidate cash from redis
    // await invalidateRedisCash({ isUsers: true, userId: _id });
    // 2. Response
    res.status(201).json({
        success: true,
        message: user.showBadges ? "Show Badges On Successfully" : "Show Badges Off SuccessFully",
    });
});

// -------------------------Redis Caching--------------------
// http://localhost:4000/api/v1/users/user/referred/:userId
// ---------------------------------------------------------
// Get All Referred Users

export const getAllReferredUsers = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) return next(new CustomError("Invalid User Id", 400));
    // making a redis key and cash data
    const redisKey = `user-referred:${userId}`;
    let user;
    // if (await redisClient.exists(redisKey)) {
    //     user = JSON.parse(await redisClient.get(redisKey));
    // } else {
    user = await User.findById(userId).select("referredUsers showPoints");
    if (!user) return next(new CustomError("User not found", 404));
    // If user has points, populate referredUsers
    if (user.showPoints) await user.populate("referredUsers", "name username photo");
    // add in redis db
    //     await redisClient.set(redisKey, JSON.stringify(user));
    // }
    // Response
    res.status(201).json({
        success: true,
        data: user.showPoints ? user.referredUsers : [],
    });
});

// -------------------------Redis Caching--------------------
// http://localhost:4000/api/v1/users/user/events/:userId
// ---------------------------------------------------------
// Get All Referred Users

export const getAllEventsUsersJoin = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) return next(new CustomError("Invalid User Id", 400));
    // making a redis cash key and add data or get data from redis
    const redisKey = `user-events-attend:${userId}`;
    let user;
    // if (await redisClient.exists(redisKey)) {
    //     user = JSON.parse(await redisClient.get(redisKey));
    // } else {
    user = await User.findById(userId).select("eventsAttend showPoints");
    if (!user) return next(new CustomError("User not found", 404));
    // If user has points, populate referredUsers
    if (user.showPoints) {
        await user.populate(
            "eventsAttend.eventId",
            "likeCount commentsCount shares likes poster title youTubeUrl createdAt updatedAt startTime endTime location"
        );
    }
    // add in redis db
    //     await redisClient.set(redisKey, JSON.stringify(user));
    // }
    // Response
    res.status(201).json({
        success: true,
        data: user.showPoints ? user.eventsAttend : [],
    });
});

// -------------------------------------------------------
// http://localhost:4000/api/v1/users/user/ban/:userId
// -------------------------------------------------------
// get events reach

export const banAUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) return next(new CustomError("Invalid User Id", 400));
    let user = await User.findById(userId).select("isBanned name username");
    if (!user) return next(new CustomError("User Not Found", 404));
    user.isBanned = !user.isBanned;
    await user.save();
    // invalidate cash from redis
    // await invalidateRedisCash({ isUsers: true, userId: _id });
    // Send the response
    res.status(200).json({
        success: true,
        message: user.isBanned ? `${user.name} Is Banned Now` : `${user.name} Is Unbanned Now`,
    });
});

// ---------------------Invalidate----------------------
// http://localhost:4000/api/v1/users/profile/referredby
// -----------------------------------------------------
// referred from profile

export const profileReferredBy = asyncHandler(async (req, res, next) => {
    // get the userId
    const userId = req.user._id;
    if (!isValidObjectId(userId)) return next(new CustomError("Invalid User Id", 400));
    const { referredBy } = req.body;
    if (!referredBy) {
        return next(new CustomError("Please Provide Referral Code First", 400));
    }
    // is this code exist in database
    const isExistReferredBy = await User.exists({ referralCode: referredBy });
    if (!isExistReferredBy) {
        return next(new CustomError("Please Enter a Correct Referral Code", 400));
    } else if (String(isExistReferredBy._id) === String(userId)) {
        return next(new CustomError("You Cannot Referred Yourself", 400));
    }
    // get user from database and update
    let user = await User.findById(userId).select("referredBy");
    if (!user) {
        return next(new CustomError("User Not Found", 404));
    } else if (user.referredBy) {
        return next(new CustomError("You are Already Referred By Someone", 403));
    }
    user.referredBy = referredBy;
    await user.save();
    // del the cashes of referral code user
    // await invalidateRedisCash({
    //     isUsers: true,
    //     userId: isExistReferredBy._id,
    //     userReferredId: isExistReferredBy._id,
    // });
    // Send the response
    res.status(200).json({
        success: true,
        message: "Referred Done Successfully",
    });
});

// ---------------------------------------------------
// http://localhost:4000/api/v1/users/remove/token
// ---------------------------------------------------
// remove csrf token

export const removeMyCsrfToken = asyncHandler(async (req, res, next) => {
    // remove csrf token and destroy session storage
    await removeCsTokenAndDestroySession(req);
    // send response
    res.status(200).json({
        success: true,
        message: "Token Removed Successfully",
    });
});

// ---------------------------------------------------
// http://localhost:4000/api/v1/users/create/token
// ---------------------------------------------------
// generate a csrf token and add in session storage

export const createMyCsrfToken = asyncHandler(async (req, res, next) => {
    const csrfToken = await generateRandomScrfToken(req);
    if (!csrfToken) return next(new CustomError("Error While generating csrf token", 500));
    // send response
    res.status(200).json({
        success: true,
        csrfToken: csrfToken.value,
    });
});

export const searchUserForAdd = asyncHandler(async (req, res, next) => {
    const { username } = req.query;
    if (!username) {
        return next(new CustomError("Please Provide Username", 400));
    }
    const users = await User.find({
        username: { $regex: username, $options: "i" },
    })
        .limit(15)
        .select("username name photo");
    // send response
    res.status(200).json({
        success: true,
        users,
    });
});

// ---------------------------------------------------
// http://localhost:4000/api/v1/users/forget/password
// ---------------------------------------------------
// forget password

export const forgetPassword = asyncHandler(async (req, res, next) => {
    // get phone number from body
    const { phoneNumber } = req.body;
    if (!phoneNumber) return next(new CustomError("Please Provide Phone Number", 400));
    // find user form database
    const user = await User.findOne({ phoneNumber });
    if (!user) return next(new CustomError("User Not Found", 404));
    // generate a random 6 digit otp
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // send otp on user number
    const accountSid = process.env.TWILIO_SID;
    const authToken = process.env.TWILIO_TOKEN;
    const client = twilio(accountSid, authToken);
    // send otp via whatsapp
    // const result = await client.messages.create({
    //     from: "whatsapp:+14155238886",
    //     body: "Your OTP is " + otp,
    //     to: `whatsapp:${phoneNumber}`,
    // });
    // send otp via sms
    const result = await client.messages.create({
        body: `Your otp for reset password of lets-connect is ${otp}`,
        from: "+19033262941",
        to: phoneNumber,
    });
    if (result.errorMessage) {
        return next(new CustomError(result.errorMessage, 400));
    }
    // save otp in database
    user.otp = otp;
    user.otpExpiry = Date.now() + 2 * 60 * 1000;
    await user.save();
    // send response
    res.status(200).json({
        success: true,
        message: "OTP Sent Successfully",
    });
});
// ---------------------------------------------------
// http://localhost:4000/api/v1/users/reset/password
// ---------------------------------------------------
// reset password

export const resetPassword = asyncHandler(async (req, res, next) => {
    // get required data form body
    const { phoneNumber, otp, password } = req.body;
    if (!phoneNumber) return next(new CustomError("Please Enter Your PhoneNumber", 400));
    if (!otp) return next(new CustomError("Please Enter Your Verification Code", 400));
    if (!password) return next(new CustomError("Please Enter Your New Password", 400));
    // get the user from mongoDb
    const user = await User.findOne({ phoneNumber }).select("password otp otpExpiry");
    if (!user) return next(new CustomError("User Not Found", 404));
    // verify otp
    if (otp !== user.otp) return next(new CustomError("Incorrect OTP Please Try again", 400));
    // check otp expiry
    if (Date.now() > user.otpExpiry) {
        user.otp = null;
        user.otpExpiry = null;
        return next(new CustomError("Your OTP is Expired Please Try again", 400));
    }
    // update password
    user.password = password;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
    // send response
    res.status(200).json({
        success: true,
        message: "Password Reset Successfully",
    });
});

// -----------------------------------------------
// http://localhost:4000/api/v1/users/access-token
// -----------------------------------------------
// get new accessToken

export const getNewAccessToken = asyncHandler(async (req, res, next) => {
    let uniqueId = req.query?.uniqueId;
    if (!uniqueId) uniqueId = req.headers["unique-id"];
    if (!uniqueId) return next(new CustomError("Unexpected Error", 401));
    let refreshToken = req.headers["refresh-token"];
    let isWeb = false;
    if (!refreshToken) {
        refreshToken = req.cookies?.refreshToken;
        isWeb = true;
    }
    if (!refreshToken) return next(new CustomError("Please Login Again", 401));
    const decryptedToken = await decryptPayload(refreshToken);
    if (!decryptedToken) return next(new CustomError("Please Login Again", 401));
    // verify token is expired or not
    const decoded = jwt.verify(decryptedToken, process.env.REFRESH_TOKEN_SECRET);
    if (!decoded) return next(new CustomError("Please Login Again", 401));
    const [user, isLiveToken] = await Promise.all([
        User.findOne({
            refreshTokens: {
                $elemMatch: {
                    uniqueId: uniqueId,
                    token: decryptedToken,
                },
            },
        }).select("refreshTokens"),
        LiveToken.exists({ refreshToken: decryptedToken }),
    ]);
    if (!user || !isLiveToken) return next(new CustomError("Please Login Again", 401));
    // remove live Token
    await LiveToken.deleteOne({ refreshToken: decryptedToken });
    sendJwtToken(res, user, `Access Token Sent Successfully`, 200, isWeb, uniqueId);
});
