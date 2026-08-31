import "dotenv/config"

export const port = Number(process.env.PORT || 3000)
export const corsAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
export const serviceAccountKeyPath = process.env.SERVICE_ACCOUNT_KEY_PATH || "serviceAccountKey.json"