import express from "express";
import {
    createAReport,
    deleteAReport,
    getReportBySearch,
    getSingleReport,
    processAReport,
} from "../controllers/reportController.js";
import { isAuthenticated, isSupOrRepHandler } from "../middlewares/auth.js";
import {
    paginationSanitizer,
    reportSanitizer,
    validatorErrorHandler,
} from "../middlewares/expressValidator.js";

const app = express();

// Get Latest Reports
app.get(
    "/search",
    isAuthenticated,
    isSupOrRepHandler,
    paginationSanitizer,
    validatorErrorHandler,
    getReportBySearch
);
// Create a report
app.post("/create", isAuthenticated, reportSanitizer, validatorErrorHandler, createAReport);
// process a report
app.put("/process/:reportId", isAuthenticated, isSupOrRepHandler, processAReport);
// get a report
app.get("/report/:reportId", isAuthenticated, isSupOrRepHandler, getSingleReport);
// Delete a report

export default app;
