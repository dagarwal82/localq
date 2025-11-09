import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (user: typeof users.$inferSelect): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email || '',
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

export const verifyToken = async (token: string): Promise<JWTPayload> => {
  const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
  const user = await db.query.users.findFirst({
    where: eq(users.id, decoded.userId)
  });

  if (!user) {
    throw new Error('User not found');
  }

  return decoded;
};

export const getUserFromRequest = (req: Request): JWTPayload | null => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
};