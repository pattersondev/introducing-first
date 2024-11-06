import { Request, Response, NextFunction } from 'express';

export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
    const apiKey = req.headers['x-api-key'];
    if (apiKey === process.env.VALID_API_KEY) {
      next(); // Call next() to pass control to the next middleware
    } else {
      res.status(403).json({ error: 'Forbidden: Invalid API Key' });
    }
  }