// import zlib from "zlib";

// // Function to compress the payload
// export const compressPayload = (payload) => {
//     return new Promise((resolve, reject) => {
//         zlib.deflate(JSON.stringify(payload), (err, buffer) => {
//             if (err) reject(err);
//             else resolve(buffer.toString("base64"));
//         });
//     });
// };

// // Function to decompress the payload
// export const decompressPayload = (compressedPayload) => {
//     return new Promise((resolve, reject) => {
//         const buffer = Buffer.from(compressedPayload, "base64");
//         zlib.inflate(buffer, (err, result) => {
//             if (err) reject(err);
//             else resolve(JSON.parse(result.toString()));
//         });
//     });
// };
