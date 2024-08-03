// Name: Allow letters, apostrophes, hyphens, and spaces
export const nameRegex = /^[a-zA-Z' -]+$/;
// username: Allow  Lower case letters, numbers, underscores, and hyphens
export const usernameRegex = /^[a-z0-9_-]+$/;
// Address: Allow letters, numbers, spaces, and common address characters
export const addressRegex = /^[a-zA-Z0-9\s,.#-]*[^$<>]+$/;
// City: Allow letters, spaces, and common city name characters
export const cityRegex = /^[a-zA-Z\s,'-]+$/;
// Country: Allow letters and spaces
export const countryRegex = /^[a-zA-Z\s]+$/;
// National ID: Allow numbers and hyphens
export const nationalIdRegex = /^[0-9-]+$/;
// Mobile Number: Allow international format with country code
export const mobileNumberRegex = /^\+[1-9]{1}[0-9]{3,14}$/;
// Email Address: Use built-in validation and disallow special characters to prevent XSS
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Bio or Comments: Disallow HTML tags and JavaScript to prevent XSS and also doesn't allow $ characters
export const contentRegex = /^[^$<>]+$/;
// Password: At least one uppercase letter, one lowercase letter, and one number and do not contain any <>$ of these
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^<>$]+$/;
// Alphanumeric: Allow only letters and numbers and spaces only without $<>
export const secureAlphanumericRegex = /^(?!.*[<>$])[a-zA-Z0-9\s]+$/;
// Alpha : Allow only letters and spaces without $<>
export const secureAlphaRegex = /^(?!.*[<>$])[a-zA-Z0-9\s]+$/;
// Safe Input: Allow only letters and spaces without $<>
export const safeInputRegex = /^[^$<>]+$/;
