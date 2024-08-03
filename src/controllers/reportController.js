import { isValidObjectId } from "mongoose";
import { CustomError, asyncHandler } from "../middlewares/asyncHandler.js";
import Report, { reportReasons, reportStatuses } from "../models/reportModel.js";
import DeletedUserPosts from "../models/deletedPostModel.js";

// -------------------------------------------
// http://localhost:4000/api/v1/reports/create
// -------------------------------------------
// Add a new report

export const createAReport = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next(new CustomError("User Id Not Found", 500));
    // 1. Destructure data from body and validate
    const { postId, reason, description = "" } = req.body;
    if (!isValidObjectId(postId)) return next(new CustomError("Invalid Post ID", 400));
    if (reason && !reportReasons.includes(reason)) return next(new CustomError("Invalid Report Reason", 400));
    // 2. Check that is report exist from this user to this report
    const existingReport = await Report.findOne({ postId, reporterId: userId });
    if (existingReport) {
        return next(new CustomError("You have already reported this post", 400));
    }
    // 3. If report not exist the add a report and send response
    const reportData = { postId, reporterId: userId, reason };
    if (description) reportData.description = description;
    const newReport = await Report.create(reportData);
    if (!newReport) {
        return next(new CustomError("Something Wrong While Creating Report", 500));
    }
    res.status(200).json({
        success: true,
        message: "Post Reported Successfully",
    });
});

// ------------------------------------------------------
// http://localhost:4000/api/v1/reports/process/:reportId
// ------------------------------------------------------
// Process a Report

export const processAReport = asyncHandler(async (req, res, next) => {
    const { reportId } = req.params;
    if (!isValidObjectId(reportId)) return next(new CustomError("Invalid Report Id", 400));
    const { status } = req.query;
    if (!status || !reportStatuses.includes(status))
        return next(new CustomError("Invalid Report Status Provided", 400));
    let report = await Report.findById(reportId);
    if (!report) return next(new CustomError("Report Not Found", 404));
    if (report.status === status) return next(new CustomError(`Report is Already ${status}`));
    report.status = status;
    await report.save();
    res.status(200).json({
        success: true,
        message: `Report Status is Updated to ${report.status}`,
    });
});

// ------------------------------------------------------
// http://localhost:4000/api/v1/reports/report/:reportId
// ------------------------------------------------------
// Delete A report

export const deleteAReport = asyncHandler(async (req, res, next) => {
    const { reportId } = req.params;
    if (!isValidObjectId(reportId)) return next(new CustomError("Invalid Report Id", 400));
    let report = await Report.findByIdAndDelete(reportId);
    if (!report) return next(new CustomError("Report Not Found", 404));
    res.status(200).json({
        success: true,
        message: "Report Deleted Successfully",
    });
});

// export const getSingleReport = asyncHandler(async (req, res, next) => {
//     const { reportId } = req.params;
//     if (!isValidObjectId(reportId)) return next(new CustomError("Invalid Report Id", 400));
//     let report = await Report.findById(reportId).populate("postId", "ownerId media");
//     if (!report) return next(new CustomError("Report Not Found", 404));
//     res.status(200).json({
//         success: true,
//         report,
//     });
// });

// -------------------------------------------
// http://localhost:4000/api/v1/reports/search
// -------------------------------------------
// get Report By search

export const getSingleReport = asyncHandler(async (req, res, next) => {
    const { reportId } = req.params;
    if (!isValidObjectId(reportId)) return next(new CustomError("Invalid Report Id", 400));

    // Populate postId with ownerId and media fields
    let [OnlyReport, report] = await Promise.all([
        Report.findById(reportId).select("postId"),
        Report.findById(reportId).populate("postId", "ownerId media"),
    ]);
    console.log(report);
    if (!report) return next(new CustomError("Report Not Found", 404));

    // Check if postId exists
    if (report.postId) {
        // Extract ownerId as a simple string
        const ownerId = report.postId.ownerId._id.toString();
        report = report.toObject();
        report.postId.ownerId = ownerId;
    } else {
        // Populate media from DeletedPost if postId doesn't exist
        const deletedPost = await DeletedUserPosts.findOne({ postRealId: OnlyReport.postId }).select("media");
        if (deletedPost) {
            report = report.toObject();
            report.postId = {
                _id: report.postId,
                media: deletedPost.media,
            };
        }
    }

    res.status(200).json({
        success: true,
        report,
    });
});

export const getReportBySearch = asyncHandler(async (req, res, next) => {
    const { page = 1, onePageLimit = process.env.PRODUCT_PER_PAGE, category, status } = req.query;
    const skipProducts = onePageLimit * (page - 1);
    if (category && !reportReasons.includes(category)) {
        return next(new CustomError("Invalid Category", 400));
    }
    if (status && !reportStatuses.includes(status)) {
        return next(new CustomError("Invalid Status", 400));
    }
    const baseQuery = {};
    if (category) baseQuery.reason = category;
    if (status) baseQuery.status = status;
    // 2. Fetch all gallery posts from that category
    const [reports, totalReportsCount] = await Promise.all([
        Report.find(baseQuery)
            .sort({ createdAt: -1 })
            .skip(Number(skipProducts))
            .limit(Number(onePageLimit))
            .populate("postId", "media"),
        Report.countDocuments(baseQuery),
    ]);
    if (!reports) return next(new CustomError("Reports not found", 404));
    const totalPages = Math.ceil(totalReportsCount / onePageLimit);
    res.status(200).json({
        success: true,
        length: reports.length,
        reports,
        totalPages,
    });
});
