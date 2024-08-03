import { isValidObjectId } from "mongoose";
import { CustomError, asyncHandler } from "../middlewares/asyncHandler.js";
import Event from "../models/eventsModel.js";
import Gallery from "../models/galleryModel.js";
import Member from "../models/memberModel.js";
import User from "../models/userModel.js";
import { UpdateArrayAccordingData, getLastYearMonths } from "../utils/features.js";

// ----------------------------------------------
// http://localhost:4000/api/v1/admin/users/stats
// ----------------------------------------------
// get all users stats

export const allUsersStats = asyncHandler(async (req, res, next) => {
    const today = new Date();
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastOneYearDate = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    // 1 all queries in promise.all for good performance
    const [totalUsersCount, veriFiedUsersCount, ActiveUsersCount, totalOneYearUsers] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isVerified: true }),
        User.countDocuments({ lastLogin: { $gte: lastMonthDate } }),
        User.find({ createdAt: { $gte: lastOneYearDate, $lte: today } }).select("createdAt"),
    ]);
    // 2. data for user chart
    let lastOneYearUsersByMonths = new Array(12).fill(0);
    UpdateArrayAccordingData(totalOneYearUsers, lastOneYearUsersByMonths);
    const data = {
        totalUsersCount,
        veriFiedUsersCount,
        ActiveUsersCount,
        lastOneYearUsersByMonths,
        lastOneYearMonths: getLastYearMonths(),
    };
    res.status(200).json({
        success: true,
        data,
    });
});

// -------------------------------------------------------
// http://localhost:4000/api/v1/admin/users/stats/:userId
// -------------------------------------------------------
// get single user Data

export const SingleUserStats = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
        return next(new CustomError("Invalid User id", 400));
    }
    // 1 get User By His Id
    const user = await User.findById(userId).select([
        "followersCount",
        "joinedEventsCount",
        "points",
        "followingCount",
        "referralCount",
        "photo",
        "phoneNumber",
        "badges",
        "lastLogin",
        "name",
        "username",
        "email",
        "createdAt",
        "isBanned",
        "gender",
    ]);
    if (!user) return next(new CustomError("User Not Found", 404));
    res.status(200).json({
        success: true,
        user,
    });
});

// --------------------------------------------------
// http://localhost:4000/api/v1/admin/members/search
// -------------------------------------------------
// get Users By Search

export const getUsersBySearch = asyncHandler(async (req, res, next) => {
    const { page = 1, onePageLimit = 20, name, pointsStart = 0, pointsEnd = Infinity, gender } = req.query;
    const skipUsers = (page - 1) * onePageLimit;
    // const sanitizedName = name && typeof name === "string" && name.length > 21 ? name.substring(0, 20) : "";
    //  making base query and get users
    let baseQuery = {};
    if (gender) baseQuery.gender = gender;
    if (name) baseQuery.name = { $regex: new RegExp(name, "i") };
    if (pointsStart || pointsEnd) baseQuery.points = { $gte: pointsStart, $lte: pointsEnd };
    const [users, totalUsers] = await Promise.all([
        User.find(baseQuery).sort({ createdAt: -1 }).skip(Number(skipUsers)).limit(Number(onePageLimit)),
        User.countDocuments(baseQuery),
    ]);
    // get total page from mongodb
    const totalPages = Math.ceil(totalUsers / onePageLimit);
    res.status(200).json({
        success: true,
        totalPages,
        users,
    });
});

// ================================== Members  ==============================================

// ----------------------------------------------
// http://localhost:4000/api/v1/admin/members/stats
// ----------------------------------------------
// get All members Stats

export const allMembersStats = asyncHandler(async (req, res, next) => {
    const today = new Date();
    const lastOneYearDate = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    // 1 all queries in promise.all for good performance
    const [totalMembersCount, totalOneYearMembers, totalMaleMembersCount, totalFemaleMembersCount] =
        await Promise.all([
            Member.countDocuments(),
            Member.find({ createdAt: { $gte: lastOneYearDate, $lte: today } }).select("createdAt"),
            Member.countDocuments({ gender: "male" }),
            Member.countDocuments({ gender: "female" }),
        ]);
    // data for user chart
    let lastOneYearMembersByMonths = new Array(12).fill(0);
    UpdateArrayAccordingData(totalOneYearMembers, lastOneYearMembersByMonths);
    const data = {
        totalMembersCount,
        totalMaleMembersCount,
        totalFemaleMembersCount,
        lastOneYearMembersByMonths,
        lastOneYearMonths: getLastYearMonths(),
    };
    res.status(200).json({
        success: true,
        data,
    });
});

// -------------------------------------------------------
// http://localhost:4000/api/v1/admin/users/stats/:memberId
// -------------------------------------------------------
// get Single Member Data

export const SingleMemberStats = asyncHandler(async (req, res, next) => {
    const { memberId } = req.params;
    if (!isValidObjectId(memberId)) return next(new CustomError("Invalid Member id", 400));
    // 1 get Member By His Id
    const member = await Member.findById(memberId);
    if (!member) return next(new CustomError("Member Not Found", 400));
    res.status(200).json({
        success: true,
        member,
    });
});

// http://localhost:4000/api/v1/admin/members/search
// -------------------------------------------------
// get Members By Search

export const getMemberBySearch = asyncHandler(async (req, res, next) => {
    const {
        page = 1,
        onePageLimit,
        ageStart = 0,
        ageEnd = 200,
        martialStatus,
        city,
        gender,
        socialLink,
        name,
        isExcel = "no",
    } = req.query;
    const skipUsers = (page - 1) * onePageLimit;
    // 1 get User By His Id
    let baseQuery = {};
    if (ageStart || ageEnd) baseQuery.age = { $gte: ageStart, $lte: ageEnd };
    if (martialStatus) baseQuery.maritalStatus = martialStatus;
    if (gender) baseQuery.gender = gender;
    if (city) baseQuery.city = { $regex: new RegExp(city, "i") };
    if (name) {
        baseQuery.$or = [
            { firstName: { $regex: new RegExp(name, "i") } },
            { lastName: { $regex: new RegExp(name, "i") } },
        ];
    }
    if (socialLink) baseQuery[socialLink] = { $exists: true, $ne: "" };

    // if we want excel data
    if (isExcel === "yes") {
        const members = await Member.find(baseQuery).sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            members,
        });
    }

    const [members, totalMembersCount] = await Promise.all([
        Member.find(baseQuery).sort({ createdAt: -1 }).skip(skipUsers).limit(onePageLimit),
        Member.countDocuments(baseQuery),
    ]);

    const totalPages = Math.ceil(totalMembersCount / onePageLimit);
    // data for user chart
    res.status(200).json({
        success: true,
        totalPages,
        members,
    });
});

// ================================== Gallery  ============================================

// http://localhost:4000/api/v1/admin/gallery/stats
// -------------------------------------------------
// get gallery stats

export const allGalleryStats = asyncHandler(async (req, res, next) => {
    // 1 all queries in promise.all for good performance
    const [
        PakistaniImagesCount,
        PakistaniVideosCount,
        PakistaniReelsCount,
        interNationalImagesCount,
        interNationalVideosCount,
        interNationalReelsCount,
    ] = await Promise.all([
        Gallery.countDocuments({ newsType: "pakistani", category: "image" }),
        Gallery.countDocuments({ newsType: "pakistani", category: "video" }),
        Gallery.countDocuments({ newsType: "pakistani", category: "reel" }),
        Gallery.countDocuments({ newsType: "international", category: "image" }),
        Gallery.countDocuments({ newsType: "international", category: "video" }),
        Gallery.countDocuments({ newsType: "international", category: "reel" }),
    ]);
    let data = {
        PakistaniImagesCount,
        PakistaniVideosCount,
        PakistaniReelsCount,
        interNationalImagesCount,
        interNationalVideosCount,
        interNationalReelsCount,
    };

    res.status(200).json({
        success: true,
        data,
    });
});

// ==================================  Events  ============================================

// -------------------------------------------------
// http://localhost:4000/api/v1/admin/events/stats
// -------------------------------------------------
// get events stats

export const allEventsStats = asyncHandler(async (req, res, next) => {
    const today = new Date();
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    // 1. Execute all queries concurrently for better performance
    const [totalEventsCount, lastMonthEventCount, lastMonthEvents] = await Promise.all([
        Event.countDocuments(),
        Event.countDocuments({ createdAt: { $gte: lastMonthDate, $lte: today } }),
        Event.find({ createdAt: { $gte: lastMonthDate, $lte: today } }).select("attendenceCount"),
    ]);
    // 2. Calculate the total attendance for last month's events
    const lastMonthAttendance = lastMonthEvents.reduce(
        (totalAttendance, event) => (totalAttendance += event.attendenceCount || 0),
        0
    );
    // 3. Prepare the data object
    let data = {
        totalEventsCount,
        lastMonthEventCount,
        lastMonthAttendance,
    };
    // 4. Send Response
    res.status(200).json({
        success: true,
        data,
    });
});

// -------------------------------------------------------
// http://localhost:4000/api/v1/admin/event/react/:eventId
// -------------------------------------------------------
// get events reach

export const ReachOnThisEvent = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    if (!isValidObjectId(eventId)) return next(new CustomError("Invalid Event Id", 400));
    const event = await Event.findById(eventId).select(
        "startTime endTime attendence attendenceCount likesCount commentsCount shares allowComments allowShares title poster createdAt location"
    );
    if (!event) return next(new CustomError("Event not found", 404));
    // Define the number of intervals
    const chartLength = 6;
    const eventDuration = event.endTime.getTime() - event.startTime.getTime();
    const durationForChart = eventDuration / chartLength;
    // Create chartData with start times and user counts
    let chartLabels = [];
    let chartData = [];
    for (let i = 0; i < chartLength; i++) {
        let startTime = new Date(event.startTime.getTime() + durationForChart * i);
        let timeString = `${startTime.getUTCHours()}:${startTime.getUTCMinutes()}`;
        chartLabels.push(timeString);
        chartData.push(0);
    }
    event.attendence.forEach((user) => {
        const userJoinTime = new Date(user.createdAt).getTime();
        const intervalIndex = Math.floor((userJoinTime - event.startTime.getTime()) / durationForChart);
        if (intervalIndex >= 0 && intervalIndex < chartLength) {
            chartData[intervalIndex]++;
        }
    });
    const chartObject = {
        data: chartData,
        label: chartLabels,
    };
    // Prepare the data
    const data = {
        event,
        totalJoined: event.attendenceCount,
        chartObject,
    };
    // Send the response
    res.status(200).json({
        success: true,
        data,
    });
});

// http://localhost:4000/api/v1/admin/events/search
// -------------------------------------------------
// get Events By Search

export const getEventsBySearch = asyncHandler(async (req, res, next) => {
    const { page = 1, onePageLimit = 20, title } = req.query;
    const skipUsers = (page - 1) * onePageLimit;
    // 1 get User By His Id
    let baseQuery = {};
    if (title) baseQuery.title = { $regex: new RegExp(title, "i") };
    const [events, totalEventsCount] = await Promise.all([
        Event.find(baseQuery).sort({ createdAt: -1 }).skip(skipUsers).limit(onePageLimit),
        Event.countDocuments(baseQuery),
    ]);
    const totalPages = Math.ceil(totalEventsCount / onePageLimit);
    // data for user chart
    res.status(200).json({
        success: true,
        events,
        totalPages,
    });
});
