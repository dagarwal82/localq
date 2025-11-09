import { Request, Response, NextFunction } from 'express';
import { getUserFromRequest } from '../auth';

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};