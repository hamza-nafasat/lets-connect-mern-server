import express from "express";
import {
    ReachOnThisEvent,
    SingleMemberStats,
    SingleUserStats,
    allEventsStats,
    allGalleryStats,
    allMembersStats,
    allUsersStats,
    getEventsBySearch,
    getMemberBySearch,
    getUsersBySearch,
} from "../controllers/statsControllers.js";
import { isAdmin, isAuthenticated, isSupOrPostHandler } from "../middlewares/auth.js";
import {
    eventsStatsSearchSanitizer,
    memberStatsSearchSanitizer,
    userStatsSearchSanitizer,
    validatorErrorHandler,
} from "../middlewares/expressValidator.js";

const app = express();

// user stats
app.get("/users/stats", isAuthenticated, isAdmin, allUsersStats);
app.get("/user/stats/:userId", isAuthenticated, isAdmin, SingleUserStats);
app.get(
    "/users/search",
    isAuthenticated,
    isAdmin,
    userStatsSearchSanitizer,
    validatorErrorHandler,
    getUsersBySearch
);

// member stats
app.get("/members/stats", isAuthenticated, isAdmin, allMembersStats);
app.get("/member/stats/:memberId", isAuthenticated, isAdmin, SingleMemberStats);
app.get(
    "/members/search",
    isAuthenticated,
    isAdmin,
    memberStatsSearchSanitizer,
    validatorErrorHandler,
    getMemberBySearch
);
// gallery stats
app.get("/gallery/stats", isAuthenticated, isSupOrPostHandler, allGalleryStats);

// events stats
app.get("/events/stats", isAuthenticated, isSupOrPostHandler, allEventsStats);
app.get("/event/reach/:eventId", isAuthenticated, isSupOrPostHandler, ReachOnThisEvent);
app.get(
    "/events/search",
    isAuthenticated,
    isSupOrPostHandler,
    eventsStatsSearchSanitizer,
    validatorErrorHandler,
    getEventsBySearch
);

export default app;
