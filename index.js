import app from "./src/app.js";
import dotenv from "dotenv";
import connectDB from "./src/config/connectDB.js";

// creating redis client
// export const redisClient = new Redis();
export const redisClient = "redis://localhost:6379";

// attaching env variables in this app
dotenv.config({
    path: "./.env",
});

const mongoDbUrl = process.env.MONGODB_URL || "mongodb://localhost:27017";
const dbName = process.env.DATA_BASE_NAME || "social-media-app";

(async () => {
    try {
        await connectDB(mongoDbUrl, dbName);
        // Starting the server
        app.listen(process.env.PORT || 3000, () => {
            console.log(`Server is listening at http://localhost:${process.env.PORT || 3000}`);
        });
    } catch (error) {
        console.log("Error during server listening", error);
        process.exit(1);
    }
})();
