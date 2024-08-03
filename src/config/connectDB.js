import mongoose from "mongoose";

const connectDB = async (dbUrl, dbName) => {
	try {
		const result = await mongoose.connect(dbUrl, { dbName });
		const { name, host, port } = result.connection;
		console.log(`${name} Database Connected on: ${host}:${port}`);
	} catch (error) {
		console.log("Error in connectDB function while connecting database", error);
		process.exit(1);
	}
};

export default connectDB;
