import B2 from "backblaze-b2";
import dotenv from "dotenv";
import path from "path";
import { v4 as uuid } from "uuid";

dotenv.config();

const b2 = new B2({
    applicationKeyId: process.env.BLACK_BLAZE_APPLICATION_KEY_ID,
    applicationKey: process.env.BLACK_BLAZE_APPLICATION_KEY,
});

export const deleteFromBlackBlaze = async (fileId, fileName) => {
    try {
        if (fileId == "default" || fileName == "default") return true;
        const authResponse = await b2.authorize();
        const result = await b2.deleteFileVersion({
            fileId: fileId,
            fileName: fileName,
        });
        return result;
    } catch (error) {
        console.log("error in deleteFileFromBlackBlaze Function ", error);
    }
};

export const uploadOnBlackBlaze = async (file) => {
    try {
        if (!file) throw new Error("File Not Found For Upload On BlackBlaze");
        const ext = path.extname(file.originalname);
        // first authorized and get download url
        const authResponse = await b2.authorize();
        const { downloadUrl } = authResponse.data;
        // get uploadUrl and authorizationToken for upload file in blackblaze
        const response = await b2.getUploadUrl({ bucketId: process.env.BLACK_BLAZE_BUCKET_ID });
        const { uploadUrl, authorizationToken } = response.data;
        // upload file on blackBlaze
        const params = {
            uploadUrl: uploadUrl,
            uploadAuthToken: authorizationToken,
            fileName: `${file.originalname}-${uuid()}${ext}`,
            data: file.buffer,
        };
        const { data } = await b2.uploadFile(params);
        // make a url of that file which we upload on blackBlaze
        const url = `${downloadUrl}/file/${process.env.BLACK_BLAZE_BUCKET_NAME}/${data.fileName}`;
        // return fileId fileName too bcz they are necessary for delete this file
        return { fileId: String(data.fileId), fileName: String(data.fileName), url: url };
    } catch (error) {
        console.log(error);
    }
};
