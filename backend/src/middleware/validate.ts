import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

// All API inputs are validated server-side with zod schemas — frontend
// validation is treated purely as UX, never as the source of truth.
// Usage: router.post("/x", validate({ body: schema, query: schema2 }), handler)
export function validate(schemas: { body?: AnyZodObject; query?: AnyZodObject; params?: AnyZodObject }) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) req.query = schemas.query.parse(req.query) as any;
    if (schemas.params) req.params = schemas.params.parse(req.params) as any;
    next();
  };
}
