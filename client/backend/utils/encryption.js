const crypto = require("crypto")

const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY
if (!ENCRYPTION_KEY_HEX || !/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY_HEX)) {
  throw new Error(
    "ENCRYPTION_KEY must be a 64-character hex string (32 bytes) for aes-256-gcm. " +
      "Set a consistent key in your environment to avoid decryption failures.",
  )
}
const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY_HEX, "hex")

function encryptMessage(text) {
  try {
    if (typeof text !== "string") {
      text = String(text)
    }

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv("aes-256-gcm", KEY_BUFFER, iv)
    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")
    const authTag = cipher.getAuthTag().toString("hex")

    return JSON.stringify({
      iv: iv.toString("hex"),
      content: encrypted,
      authTag,
    })
  } catch (error) {
    console.error("Encryption error:", error)
    throw new Error("Failed to encrypt message")
  }
}

function decryptMessage(encryptedDataString) {
  try {
    // Quickly return if it's not JSON; this handles legacy/plaintext gracefully
    if (typeof encryptedDataString !== "string" || encryptedDataString[0] !== "{") {
      return encryptedDataString
    }

    const parsed = JSON.parse(encryptedDataString)
    // Only attempt decryption if the expected fields exist
    if (!parsed || !parsed.iv || !parsed.content || !parsed.authTag) {
      return encryptedDataString
    }

    const iv = Buffer.from(parsed.iv, "hex")
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY_BUFFER, iv)
    decipher.setAuthTag(Buffer.from(parsed.authTag, "hex"))
    let decrypted = decipher.update(parsed.content, "hex", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  } catch (_error) {
    return encryptedDataString
  }
}

module.exports = { encryptMessage, decryptMessage }
