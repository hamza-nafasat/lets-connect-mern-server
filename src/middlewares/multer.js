import multer from "multer";

// const storage = multer.diskStorage({
// 	import { v4 as uuid } from "uuid";
// import path from "path";
// 	destination: (req, file, cb) => {
// 		cb(null, "uploads");
// 	},
// 	filename: (req, file, cb) => {
// 		const ext = path.extname(file.originalname);
// 		cb(null, `${file.originalname}-${uuid()}${ext}`);
// 	},
// });
// const fileFilter= (req, file, cb) => {
// 	if (file.mimetype.startsWith("video/") && file.size > 15 * 1024 * 1024) {
// 		cb(new multer.MulterError("FILE_SIZE", "Video size cannot exceed 15MB"));
// 	} else {
// 		cb(null, true);
// 	}
// }

const storage = multer.memoryStorage();
const singleUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
}).single("file");

const multiUpload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 },
}).array("files");

export { multiUpload, singleUpload };
