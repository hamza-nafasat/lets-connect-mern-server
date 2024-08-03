import { CustomError, asyncHandler } from "../middlewares/asyncHandler.js";
import Member, { bloodGroups, currentWorkStatuses, genders, maritalStatuses } from "../models/memberModel.js";

// ----------------------------------------
// http://localhost:4000/api/v1/members/new
// ----------------------------------------
// New user registration as a member

export const registerNewMember = asyncHandler(async (req, res, next) => {
    const user = req.user;
    // 1. Destructure Data We Are Getting From Body
    const {
        firstName,
        lastName,
        dateOfBirth,
        nationalId,
        passportNumber,
        gender,
        email,
        fatherName,
        maritalStatus,
        numberOfFamilyMembers,
        numberOfChildren,
        houseAddress,
        country,
        city,
        state,
        currentWorkStatus,
        profession,
        jobTitle,
        workExperience,
        education,
        facebook,
        instagram,
        twitter,
        linkedIn,
    } = req.body;
    if (!nationalId && !passportNumber) {
        return next(new CustomError("Please Provide National Id or Passport Number", 400));
    }
    if (!firstName) return next(new CustomError("Please Provide firstName ", 400));
    if (!lastName) return next(new CustomError("Please Provide lastName ", 400));
    if (!dateOfBirth) return next(new CustomError("Please Provide dateOfBirth ", 400));
    if (!gender) return next(new CustomError("Please Provide firstName ", 400));
    if (!fatherName) return next(new CustomError("Please Provide fatherName ", 400));
    if (!maritalStatus) return next(new CustomError("Please Provide maritalStatus ", 400));
    if (!numberOfFamilyMembers) return next(new CustomError("Please Provide numberOfFamilyMembers ", 400));
    if (!houseAddress) return next(new CustomError("Please Provide houseAddress ", 400));
    if (!country) return next(new CustomError("Please Provide country ", 400));
    if (!city) return next(new CustomError("Please Provide city ", 400));
    if (!state) return next(new CustomError("Please Provide state ", 400));
    if (!currentWorkStatus) return next(new CustomError("Please Provide currentWorkStatus ", 400));
    if (!education) return next(new CustomError("Please Provide education ", 400));

    if (!maritalStatuses.includes(maritalStatus)) {
        return next(new CustomError("Invalid Martial Status", 400));
    }
    if (!genders.includes(gender)) {
        return next(new CustomError("Invalid Gender", 400));
    }
    if (!currentWorkStatuses.includes(currentWorkStatus)) {
        return next(new CustomError("Invalid Work Status", 400));
    }
    // 2. Unique Field Checks using Mongoose Query Optimization
    const existingEmail = await Member.exists({ email });
    if (existingEmail) {
        return next(new CustomError("Email already in use", 409));
    }
    const existingNationalId = await Member.exists({ nationalId });
    if (existingNationalId) return next(new CustomError("National ID already in use", 409));

    // 3. Creating a new user in database
    const newMemberData = {
        userId: user._id,
        firstName,
        lastName,
        dateOfBirth,
        nationalId,
        gender,
        email,
        fatherName,
        numberOfFamilyMembers,
        houseAddress,
        country,
        city,
        state,
        currentWorkStatus,
        education,
        maritalStatus,
    };
    if (numberOfChildren) newMemberData.numberOfChildren = numberOfChildren;
    if (profession) newMemberData.profession = profession;
    if (jobTitle) newMemberData.jobTitle = jobTitle;
    if (workExperience) newMemberData.workExperience = workExperience;
    if (facebook) newMemberData.facebook = facebook;
    if (instagram) newMemberData.instagram = instagram;
    if (twitter) newMemberData.twitter = twitter;
    if (linkedIn) newMemberData.linkedIn = linkedIn;
    const member = await Member.create(newMemberData);
    if (!member) {
        return next(new CustomError("Error While Becoming a Member", 500));
    }
    // 4. Response with jwt token
    res.status(201).json({
        success: true,
        message: "You Are Successfully Become A Member",
    });
});
