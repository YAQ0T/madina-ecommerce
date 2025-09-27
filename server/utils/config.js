// server/utils/config.js

const MIN_JWT_SECRET_LENGTH = 32;
let cachedJwtSecret = null;

function getJwtSecret() {
  if (cachedJwtSecret) return cachedJwtSecret;

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set and at least ${MIN_JWT_SECRET_LENGTH} characters long. ` +
        "Provide a strong, random secret in your environment configuration."
    );
  }

  cachedJwtSecret = secret;
  return cachedJwtSecret;
}

module.exports = { getJwtSecret, MIN_JWT_SECRET_LENGTH };
