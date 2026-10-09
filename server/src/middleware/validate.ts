import { AnyZodObject, ZodEffects } from 'zod';
import { Request, Response, NextFunction } from 'express';

type Schema = AnyZodObject | ZodEffects<AnyZodObject>;

/** Validate and coerce a request body against a Zod schema. */
export function validateBody(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}
