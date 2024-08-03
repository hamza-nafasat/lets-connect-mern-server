import { Schema, model } from "mongoose";
import User from "./userModel.js";

export const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const genders = ["male", "female", "prefer not to say"];
export const maritalStatuses = ["married", "single"];
export const currentWorkStatuses = ["job", "jobless"];

const memberSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        gender: {
            type: String,
            required: true,
            enum: genders,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        nationalId: {
            type: String,
            trim: true,
        },
        passportNumber: {
            type: String,
            trim: true,
        },
        dateOfBirth: {
            type: Date,
            required: true,
        },
        fatherName: {
            type: String,
            required: true,
            trim: true,
        },
        maritalStatus: {
            type: String,
            required: true,
            enum: maritalStatuses,
        },
        numberOfFamilyMembers: {
            type: Number,
            required: true,
        },
        numberOfChildren: {
            type: Number,
        },
        houseAddress: {
            type: String,
            required: true,
            trim: true,
        },
        contactNumber: {
            type: String,
        },
        country: {
            type: String,
            required: true,
        },
        state: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        currentWorkStatus: {
            type: String,
            required: true,
            enum: currentWorkStatuses,
        },
        profession: {
            type: String,
        },
        age: {
            type: Number,
        },
        jobTitle: {
            type: String,
        },
        education: {
            type: String,
            required: true,
        },
        workExperience: {
            type: Number,
        },
        facebook: String,
        instagram: String,
        twitter: String,
        linkedIn: String,
    },
    { timestamps: true }
);
// getting email and phoneNumber from user
// --------------------------------------
memberSchema.pre("save", async function (next) {
    const member = this;
    if (member.isNew) {
        try {
            member.age = calculateAge(member.dateOfBirth);
            const user = await User.findById(member.userId);
            if (user) {
                user.isVerified = true;
                member.email = user.email;
                member.contactNumber = user.phoneNumber;
                await user.save();
            }
        } catch (error) {
            console.error("Error during verified user:", error.message);
        }
    }
    next();
});

export const Member = model("Member", memberSchema);
export default Member;

function calculateAge(birthDate, otherDate) {
    birthDate = new Date(birthDate);
    otherDate = new Date(otherDate || Date.now());
    let years = otherDate.getFullYear() - birthDate.getFullYear();
    if (
        otherDate.getMonth() < birthDate.getMonth() ||
        (otherDate.getMonth() === birthDate.getMonth() && otherDate.getDate() < birthDate.getDate())
    ) {
        years--;
    }
    return years;
}
