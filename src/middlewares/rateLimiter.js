import rateLimit from "express-rate-limit";
import { CustomError } from "./asyncHandler.js";

const rateLimiter = rateLimit({
    windowMs: 1000 * 60 * 15,
    max: 100,
    handler: (req, res, next) => {
        next(new CustomError("Too many requests, please try again later.", 429));
    },
});

export default rateLimiter;
