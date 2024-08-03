import express from "express";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import galleryPostRoutes from "./routes/galleryRoutes.js";
import eventsRoutes from "./routes/eventsRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { ErrorMiddleWare } from "./middlewares/asyncHandler.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import rateLimiter from "./middlewares/rateLimiter.js";
import session from "express-session";
import helmet from "helmet";

const app = express();

app.use(
    cors({
        credentials: true,
        origin: ["http://localhost:5173", "https://lets-connect-2024.vercel.app"],
        methods: ["GET", "POST", "PUT", "DELETE"],
    })
);
// using helmet for adding security headers in website
// app.use(helmet());
// using rate limiter for avoiding multiple fake requestes
// app.use(rateLimiter);
app.use(morgan("dev"));

app.use(
    session({
        secret: process.env.RANDOM_SESSION_SECRET_KEY,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: true, httpOnly: true, maxAge: 3600000 * 24 },
        // cookie: { secure: true, httpOnly: true, maxAge: 3600000 * 24 },
    })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route handling
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/gallery", galleryPostRoutes);
app.use("/api/v1/events", eventsRoutes);
app.use("/api/v1/members", memberRoutes);
app.use("/api/v1/admin", statsRoutes);
app.use("/api/v1/notifications", notificationRoutes);

app.get("/", (_, res) => {
    res.json({
        success: true, message: 'Server is up and running'
    });
});
app.use(ErrorMiddleWare);

export default app;
