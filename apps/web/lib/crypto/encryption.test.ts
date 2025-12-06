import { describe, it, expect } from "vitest";
import { encryptAPIKey, decryptAPIKey } from "./encryption";

describe("Encryption Logic", () => {
    const apiKey = "sk-test-1234567890abcdef";
    const password = "my-secret-password";

    it("should encrypt and decrypt correctly with the correct password", async () => {
        const encrypted = await encryptAPIKey(apiKey, password);

        expect(encrypted.ciphertext).toBeDefined();
        expect(encrypted.iv).toBeDefined();
        expect(encrypted.salt).toBeDefined();

        const decrypted = await decryptAPIKey(encrypted, password);
        expect(decrypted).toBe(apiKey);
    });

    it("should fail to decrypt with the wrong password", async () => {
        const encrypted = await encryptAPIKey(apiKey, password);
        const wrongPassword = "wrong-password";

        await expect(decryptAPIKey(encrypted, wrongPassword)).rejects.toThrow();
    });

    it("should generate different IVs and Salts for the same input", async () => {
        const encrypted1 = await encryptAPIKey(apiKey, password);
        const encrypted2 = await encryptAPIKey(apiKey, password);

        expect(encrypted1.iv).not.toBe(encrypted2.iv);
        expect(encrypted1.salt).not.toBe(encrypted2.salt);
        expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });
});
