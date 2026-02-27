import { Request, Response, NextFunction } from 'express';

/**
 * Global error handling middleware.
 * Must be registered AFTER all routes.
 * Catches unhandled errors and returns a consistent JSON response.
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

    // Don't leak stack traces in production
    const isDev = process.env.NODE_ENV !== 'production';

    res.status(500).json({
        error: 'Internal server error',
        ...(isDev && { details: err.message })
    });
};

/**
 * Catch-all for unmatched routes.
 * Must be registered AFTER all routes but BEFORE the error handler.
 */
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
};
