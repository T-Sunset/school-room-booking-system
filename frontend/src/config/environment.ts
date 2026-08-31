type FrontendEnvironment = {
  VITE_FIREBASE_API_KEY: string
  VITE_FIREBASE_AUTH_DOMAIN: string
  VITE_FIREBASE_PROJECT_ID: string
  VITE_FIREBASE_STORAGE_BUCKET: string
  VITE_FIREBASE_MESSAGING_SENDER_ID: string
  VITE_FIREBASE_APP_ID: string
  VITE_API_BASE_URL: string
}

const requiredVariables: Array<keyof FrontendEnvironment> = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_API_BASE_URL"
]

const environmentValues: FrontendEnvironment = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL
}

const missingVariables = requiredVariables.filter((name) => {
  const value = environmentValues[name]
  return typeof value !== "string" || value.trim() === ""
})

if (missingVariables.length > 0) {
  throw new Error(
    `Missing frontend environment variable(s): ${missingVariables.join(", ")}. ` +
    "Create frontend/.env.local from frontend/.env.example and provide your development values."
  )
}

export const frontendEnvironment = requiredVariables.reduce((environment, name) => {
  environment[name] = environmentValues[name].trim()
  return environment
}, {} as FrontendEnvironment)