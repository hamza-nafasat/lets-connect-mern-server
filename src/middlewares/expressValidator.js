import { body, query, validationResult } from "express-validator";
import { galleryCategories, newsTypeForGallery } from "../models/galleryModel.js";
import { bloodGroups, currentWorkStatuses, genders, maritalStatuses } from "../models/memberModel.js";
import { notificationTypes } from "../models/notificationModel.js";
import { postCategories, postMediaTypes } from "../models/postModel.js";
import { reportReasons } from "../models/reportModel.js";
import {
    addressRegex,
    cityRegex,
    countryRegex,
    nationalIdRegex,
    safeInputRegex,
    secureAlphaRegex,
    usernameRegex,
} from "../utils/regex.js";
import { CustomError } from "./asyncHandler.js";
import { userGenders } from "../models/userModel.js";

// ============================================================
// VALIDATOR ERROR HANDLERS
// ============================================================

export const validatorErrorHandler = (req, res, next) => {
    const errors = validationResult(req);
    let errorMessage = "Some Thing Wrong With Your Request";
    if (!errors.isEmpty()) {
        if (errors.array().length > 0) {
            errorMessage = errors.array()[0].msg;
        }
        return next(new CustomError(errorMessage, 400));
    }
    next();
};

// ============================================================
// USER VALIDATOR MIDDLEWARE FUNCTION
// ============================================================

// === REGISTER ===
export const registerSanitizer = [
    body("name")
        .notEmpty()
        .withMessage("Please Enter Your Name")
        .isString()
        .withMessage("Please Enter Your Name")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed")
        .escape()
        .isLength({ min: 3, max: 20 })
        .withMessage("Name must be between 3 and 20 characters")
        .trim(),
    body("gender")
        .notEmpty()
        .withMessage("Please Enter Your Gender")
        .isString()
        .withMessage("gender must be a string")
        .custom((value) => userGenders.includes(value))
        .withMessage("Please Enter a Valid Gender."),
    body("username")
        .notEmpty()
        .withMessage("Please Enter Your Username")
        .isString()
        .withMessage("username must be a string")
        .matches(usernameRegex)
        .withMessage("Username can only contain letters, numbers, and spaces")
        .escape()
        .isLength({ min: 3, max: 20 })
        .withMessage("Username must be between 3 and 20 characters")
        .trim(),
    body("email")
        .notEmpty()
        .withMessage("Please Enter Your Email")
        .isEmail()
        .withMessage("Please enter a valid email address")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed")
        .escape(),
    body("phoneNumber")
        .notEmpty()
        .withMessage("Please Enter Your Phone Number")
        .isMobilePhone()
        .withMessage("Please Enter Correct Phone Number"),
    body("password")
        .notEmpty()
        .withMessage("Please Enter Your Password")
        .isString()
        .withMessage("Password must be a string")
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 0,
        })
        .withMessage("Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed"),
];
// === LOGIN ===
export const loginSanitizer = [
    body("phoneNumber")
        .notEmpty()
        .withMessage("Please Enter Your Phone Number")
        .isMobilePhone()
        .withMessage("Please Enter Correct Phone Number"),
    body("password")
        .notEmpty()
        .withMessage("Please Enter Your Password")
        .isString()
        .withMessage("Password must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed"),
];
// === UPDATE PROFILE ===
export const updateProfileSanitizer = [
    body("name")
        .optional()
        .isString()
        .withMessage("Name must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed")
        .escape()
        .isLength({ min: 4, max: 20 })
        .withMessage("Name must be at least 3 to 20 characters")
        .trim(),
    body("username")
        .optional()
        .isString()
        .withMessage("username must be a string")
        .matches(usernameRegex)
        .withMessage("Username can only contain letters, numbers, and spaces")
        .escape()
        .isLength({ min: 3 })
        .withMessage("Username must be at least 3 characters")
        .trim(),
    body("bio").optional().matches(safeInputRegex).withMessage("Symbols You Are Entering Are Not Allowed"),
];
// === PROFILE REFERRED BY ===
export const profileReferredBySanitizer = [
    body("referredBy")
        .notEmpty()
        .withMessage("Please Enter Your Referred By")
        .matches(safeInputRegex)
        .withMessage("Incorrect Referred By")
        .escape(),
];

// ============================================================
// POST VALIDATOR MIDDLEWARE FUNCTION
// ============================================================

// === CREATE POST ===
export const newPostSanitizer = [
    body("content")
        .optional()
        .isString()
        .withMessage("Content must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed")
        .trim(),
    body("category")
        .optional()
        .isString()
        .withMessage("category must be a string")
        .custom((value) => postCategories.includes(value))
        .withMessage("Please select a valid category"),
    body("mediaType")
        .optional()
        .isString()
        .custom((value) => postMediaTypes.includes(value))
        .withMessage("Please select a valid media type"),
    body("allowComments")
        .optional()
        .custom((value) => ["yes", "no"].includes(value))
        .withMessage("Only Yes Or No is Valid In Allow Comments"),
    body("AllowShares")
        .optional()
        .custom((value) => ["yes", "no"].includes(value))
        .withMessage("Only Yes Or No is Valid In Allow Shares"),
];
// ============================================================
// GALLERY VALIDATOR MIDDLEWARE FUNCTION
// ============================================================

// === CREATE GALLERY POST ===
export const newGalleryPostSanitizer = [
    body("title")
        .optional()
        .isString()
        .withMessage("title must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed In Title")
        .escape()
        .trim(),
    body("category")
        .custom((value) => galleryCategories.includes(value))
        .withMessage("Please select a valid category"),
    body("newsType")
        .custom((value) => newsTypeForGallery.includes(value))
        .withMessage("Please select a valid News type"),
    body("youTubeUrl").optional().isURL().withMessage("Please Enter a Valid Youtube Url"),
    body("allowComments")
        .optional()
        .custom((value) => ["yes", "no"].includes(value))
        .withMessage("Only Yes Or No is Valid In Allow Comments"),
    body("AllowShares")
        .optional()
        .custom((value) => ["yes", "no"].includes(value))
        .withMessage("Only Yes Or No is Valid In Allow Shares"),
    body("file")
        .optional()
        .custom((value, { req }) => {
            if (!req.file) {
                throw new Error("File is required");
            }
            if (!req.file.mimetype.startsWith("image/") || !req.file.mimetype.startsWith("video/")) {
                throw new Error("Only image and videos are allowed");
            }
            return true;
        }),
];
// === Update GALLERY POST ===
export const updateGalleryPostSanitizer = [
    body("title")
        .optional()
        .isString()
        .withMessage("title must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed In Title")
        .escape()
        .trim(),
    body("category")
        .optional()
        .custom((value) => galleryCategories.includes(value))
        .withMessage("Please select a valid category"),
    body("newsType")
        .optional()
        .custom((value) => newsTypeForGallery.includes(value))
        .withMessage("Please select a valid News type"),
    body("youTubeUrl").optional().isURL().withMessage("Please Enter a Valid Youtube Url"),
    body("allowComments")
        .optional()
        .custom((value) => ["yes", "no"].includes(value))
        .withMessage("Only Yes Or No is Valid In Allow Comments"),
    body("AllowShares")
        .optional()
        .custom((value) => ["yes", "no"].includes(value))
        .withMessage("Only Yes Or No is Valid In Allow Shares"),
    body("file")
        .optional()
        .custom((value, { req }) => {
            if (!req.file) {
                throw new Error("File is required");
            }
            if (!req.file.mimetype.startsWith("image/") || !req.file.mimetype.startsWith("video/")) {
                throw new Error("Only image and videos are allowed");
            }
            return true;
        }),
];

// ============================================================
// REPORT VALIDATOR MIDDLEWARE FUNCTION
// ============================================================
export const reportSanitizer = [
    body("reason")
        .notEmpty()
        .withMessage("Please Enter Your Report Reason")
        .custom((value) => reportReasons.includes(value))
        .withMessage("Invalid Report Reason"),
    body("description")
        .optional()
        .isString()
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed in Description"),
    body("postId")
        .notEmpty()
        .withMessage("Please Enter Your Post Id")
        .isMongoId()
        .withMessage("Invalid Post Id"),
];
// ============================================================
// MEMBER VALIDATOR MIDDLEWARE FUNCTION
// ============================================================
export const memberSanitizer = [
    body("firstName")
        .notEmpty()
        .withMessage("Please Enter Your first name")
        .isString()
        .withMessage("firstName must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed in First Name")
        .escape()
        .isLength({ min: 3, max: 20 })
        .withMessage("Name must be between 3 and 20 characters")
        .trim(),
    body("lastName")
        .notEmpty()
        .withMessage("Please Enter Your last name")
        .isString()
        .withMessage("lastName must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed in Last Name")
        .escape()
        .isLength({ min: 3, max: 20 })
        .withMessage("Name must be between 3 and 20 characters")
        .trim(),
    body("dateOfBirth").notEmpty().withMessage("Please Enter Your Date Of Birth").isDate(),
    body("nationalId")
        .optional()
        .isString()
        .withMessage("nationalId must be a string")
        .matches(nationalIdRegex)
        .withMessage("National Id can only contain Numbers and Hyphens."),
    body("passportNumber").optional().isString(),
    body("gender")
        .notEmpty()
        .withMessage("Please Enter Your Gender")
        .isString()
        .withMessage("gender must be a string")
        .custom((value) => genders.includes(value))
        .withMessage("Please Enter a Valid Gender."),
    body("email")
        .notEmpty()
        .withMessage("Please Enter Your Email")
        .isEmail()
        .withMessage("Please enter a valid email address."),
    body("fatherName")
        .notEmpty()
        .withMessage("Please Enter Your Father Name")
        .isString()
        .withMessage("fatherName must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed in Father Name")
        .escape()
        .isLength({ min: 3, max: 20 })
        .withMessage("Father Name must be between 3 and 20 characters")
        .trim(),
    body("maritalStatus")
        .notEmpty()
        .withMessage("Please Enter Your Marital Status")
        .isString()
        .withMessage("Marital Status must be a string")
        .custom((value) => maritalStatuses.includes(value))
        .withMessage("Invalid Marital Status."),
    body("numberOfFamilyMembers")
        .notEmpty()
        .withMessage("Please Enter Your Number of Family Members")
        .isNumeric()
        .withMessage("numberOfFamilyMembers must be a number"),
    body("numberOfChildren")
        .notEmpty()
        .withMessage("Please Enter Your Number of Children")
        .isNumeric()
        .withMessage("numberOfChildren must be a number"),
    body("houseAddress")
        .notEmpty()
        .withMessage("Please Enter Your House Address")
        .isString()
        .withMessage("houseAddress must be a string")
        .matches(addressRegex)
        .withMessage("Address Only Contain Numbers, Letters, Hyphens, Spaces and these Characters (,.#-.)."),
    body("country")
        .notEmpty()
        .withMessage("Please Enter Your Country Name")
        .isString()
        .withMessage("country must be a string")
        .matches(countryRegex)
        .withMessage("Invalid Country Name."),
    body("city")
        .notEmpty()
        .withMessage("Please Enter Your City Name")
        .isString()
        .withMessage("city must be a string")
        .matches(cityRegex)
        .withMessage("Invalid City Name."),
    body("state")
        .notEmpty()
        .withMessage("Please Enter Your State Name")
        .isString()
        .withMessage("state must be a string")
        .matches(cityRegex)
        .withMessage("Invalid State Name."),
    body("currentWorkStatus")
        .notEmpty()
        .withMessage("Please Enter Your Current Work Status")
        .isString()
        .withMessage("currentWorkStatus must be a string")
        .custom((value) => currentWorkStatuses.includes(value))
        .withMessage("Only Add (jon) or (jobless) in Current Work Status."),
    body("profession")
        .notEmpty()
        .withMessage("Please Enter Your Profession")
        .isString()
        .withMessage("profession must be a string")
        .matches(secureAlphaRegex)
        .withMessage("Only Alphabets, Numbers and Spaces Are Allowed."),
    body("jobTitle")
        .notEmpty()
        .withMessage("Please Enter Your Job Title")
        .isString()
        .withMessage("jobTitle must be a string")
        .matches(secureAlphaRegex)
        .withMessage("Invalid Job Title."),
    body("workExperience").notEmpty().withMessage("Please Enter Your Work Experience").isNumeric(),
];
// ============================================================
// EVENT VALIDATOR MIDDLEWARE FUNCTION
// ============================================================

// === CREATE EVENT POST ===
export const newEventSanitizer = [
    body("title")
        .notEmpty()
        .withMessage("Please Enter Your Title")
        .isString()
        .withMessage("title must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed in Title")
        .escape()
        .trim(),
    body("latitude")
        .notEmpty()
        .withMessage("Please Enter Your Coordinates")
        .isNumeric()
        .withMessage("latitude must be a number"),
    body("longitude")
        .notEmpty()
        .withMessage("Please Enter Your Coordinates")
        .isNumeric()
        .withMessage("longitude must be a number"),
    body("startTime").notEmpty().withMessage("Please Enter Your Start Time"),
    body("endTime").optional().isString().withMessage("Please Enter Your End Time"),
    body("liveUrl").optional().isURL().withMessage("Invalid Live Url"),
    body("allowComments")
        .optional()
        .custom((value) => ["yes", "no"].includes(value))
        .withMessage("Only Yes Or No is Valid In Allow Comments"),
    body("AllowShares")
        .optional()
        .custom((value) => ["yes", "no"].includes(value))
        .withMessage("Only Yes Or No is Valid In Allow Shares"),
    body("file").custom((value, { req }) => {
        if (!req.file) {
            throw new Error("File is required");
        }
        if (!req.file.mimetype.startsWith("image/")) {
            throw new Error("Only image are allowed as Event Poster");
        }
        return true;
    }),
];
// === Update EVENT  ===
export const updateEventSanitizer = [
    body("title")
        .optional()
        .isString()
        .withMessage("title must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed in Title")
        .escape()
        .trim(),
    body("latitude").optional().isNumeric().withMessage("latitude must be a number"),
    body("longitude").optional().isNumeric().withMessage("longitude must be a number"),
    body("startTime").optional().matches(safeInputRegex).withMessage("Please Enter Valid Start Time"),
    body("endTime").optional().matches(safeInputRegex).withMessage("Please Enter Valid End Time"),
    body("liveUrl").optional().isURL().withMessage("Invalid Live Url"),
    body("allowComments")
        .optional()
        .custom((value) => ["yes", "no"].includes(value))
        .withMessage("Only Yes Or No is Valid In Allow Comments"),
    body("AllowShares")
        .optional()
        .custom((value) => ["yes", "no"].includes(value))
        .withMessage("Only Yes Or No is Valid In Allow Shares"),
];
// ============================================================
// NOTIFICATION VALIDATOR MIDDLEWARE FUNCTION
// ============================================================
// === new Notification POST ===
export const newNotificationSanitizer = [
    body("message")
        .notEmpty()
        .withMessage("Please Enter Notification Message")
        .isString()
        .withMessage("message must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed in Message")
        .escape()
        .trim(),
    body("type")
        .notEmpty()
        .withMessage("Please Enter Notification Type")
        .isString()
        .custom((value) => notificationTypes.includes(value))
        .withMessage("Only (like, comment, follow) Are Allowed"),
    body("fromUser")
        .notEmpty()
        .withMessage("Please Enter From User Id")
        .isMongoId()
        .withMessage("Invalid From User Id"),
    body("toUser")
        .notEmpty()
        .withMessage("Please Enter To User Id")
        .isMongoId()
        .withMessage("Invalid To User Id"),
    body("postId").optional().isMongoId().withMessage("Invalid Post Id"),
];

// ============================================================
// STATS VALIDATOR MIDDLEWARE FUNCTION
// ============================================================
export const userStatsSearchSanitizer = [
    query("page").optional().isNumeric().withMessage("Page must be a number"),
    query("onePageLimit").optional().isNumeric().withMessage("One Page Limit must be a number"),
    query("name").optional().isString().withMessage("Name must be a string").escape().trim(),
    query("pointsStart").optional().isNumeric().withMessage("Points Start must be a number"),
    query("pointsEnd").optional().isNumeric().withMessage("Points End must be a number"),
];

export const memberStatsSearchSanitizer = [
    query("page").optional().isNumeric().withMessage("Page must be a number"),
    query("onePageLimit").optional().isNumeric().withMessage("One Page Limit must be a number"),
    query("name").optional().isString().withMessage("Name must be a string").escape().trim(),
    query("ageStart").optional().isNumeric().withMessage("Age Start must be a number"),
    query("ageEnd").optional().isNumeric().withMessage("Age End must be a number"),
    query("martialStatus")
        .optional()
        .custom((value) => maritalStatuses.includes(value))
        .withMessage("Invalid Martial Status"),
    query("city")
        .optional()
        .isString()
        .withMessage("City must be a string")
        .matches(cityRegex)
        .withMessage("Invalid City"),
    query("gender")
        .optional()
        .custom((value) => genders.includes(value))
        .withMessage("Invalid Gender"),
    query("socialLink")
        .optional()
        .isString()
        .withMessage("Social Link must be a string")
        .matches(safeInputRegex)
        .withMessage("You Are Using Invalid Symbols")
        .escape(),
];

export const eventsStatsSearchSanitizer = [
    query("page").optional().isNumeric().withMessage("Page must be a number"),
    query("onePageLimit").optional().isNumeric().withMessage("One Page Limit must be a number"),
    query("title").optional().isString().withMessage("Title must be a string").escape().trim(),
];
// ============================================================
// COMMON
// ============================================================

// ===  PAGINATION VALIDATOR  ===
export const paginationSanitizer = [
    query("page").optional().isNumeric().withMessage("Page must be a number"),
    query("onePageLimit").optional().isNumeric().withMessage("One Page Limit must be a number"),
];
// ===  COMMENT   ===
export const commentSanitizer = [
    body("content")
        .notEmpty()
        .withMessage("Please Enter Your Comment")
        .isString()
        .withMessage("Content must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed in Comments")
        .escape()
        .trim(),
];
// ===  COMMENT REPLY  ===
export const commentReplySanitizer = [
    body("reply")
        .notEmpty()
        .withMessage("Please Enter Your Reply")
        .isString()
        .withMessage("Reply must be a string")
        .matches(safeInputRegex)
        .withMessage("Symbols You Are Entering Are Not Allowed in Replies")
        .escape()
        .trim(),
];
