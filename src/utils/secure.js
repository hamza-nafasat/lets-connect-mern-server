import jose from "node-jose";
import { configDotenv } from "dotenv";

configDotenv();

// Function to encrypt the payload
export const encryptPayload = async (payload) => {
    try {
        const keyStore = jose.JWK.createKeyStore();
        const publicKey = await keyStore.add(process.env.PUBLIC_KEY_FOR_ENCRYPTION, "pem");
        const encrypted = await jose.JWE.createEncrypt({ format: "compact" }, publicKey)
            .update(JSON.stringify(payload))
            .final();
        return encrypted;
    } catch (error) {
        console.error(`Error encrypting payload: ${error.message}`);
        throw error;
    }
};

// Function to decrypt the payload
export const decryptPayload = async (encrypted) => {
    try {
        const keyStore = jose.JWK.createKeyStore();
        const privateKey = await keyStore.add(process.env.PRIVATE_KEY_FOR_ENCRYPTION, "pem");
        const result = await jose.JWE.createDecrypt(privateKey).decrypt(encrypted);
        return JSON.parse(result.payload.toString());
    } catch (error) {
        console.error(`Error decrypting payload: ${error.message}`);
        throw error;
    }
};
