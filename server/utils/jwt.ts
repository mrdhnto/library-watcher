import { SignJWT, jwtVerify, generateSecret } from 'jose'
import { randomBytes } from 'node:crypto'

let secretKey: Uint8Array | null = null

// Initialize secret key
const getSecretKey = async () => {
  if (secretKey) return secretKey

  const envSecret = process.env.JWT_SECRET
  if (envSecret) {
    secretKey = new TextEncoder().encode(envSecret)
  } else {
    // Generate a random key for development if not provided in .env
    // Note: tokens will be invalidated on server restart!
    console.warn('WARNING: JWT_SECRET is not set in .env. A random key will be used, and all client sessions will be invalidated on server restart.')
    secretKey = randomBytes(32)
  }
  return secretKey
}

export const generateAccessToken = async (clientId: string, hostname: string) => {
  const secret = await getSecretKey()
  return await new SignJWT({ clientId, hostname, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Access token lives for 1 hour
    .sign(secret)
}

export const verifyAccessToken = async (token: string) => {
  try {
    const secret = await getSecretKey()
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256']
    })
    
    if (payload.type !== 'access') {
      return null
    }
    
    return payload
  } catch (error) {
    return null
  }
}

export const generateRefreshToken = () => {
  // Refresh tokens are just long random strings stored in the DB
  return randomBytes(48).toString('base64url')
}
