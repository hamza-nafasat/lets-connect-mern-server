import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { registerNewMember } from "../controllers/memberControllers.js";
import { memberSanitizer, validatorErrorHandler } from "../middlewares/expressValidator.js";

const app = express();

// REGISTER
app.post("/new", isAuthenticated, memberSanitizer, validatorErrorHandler, registerNewMember);

export default app;
