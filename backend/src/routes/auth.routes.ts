import { Router } from "express";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { loginHandler, loginSchema, logoutHandler, meHandler, refreshHandler } from "../controllers/auth.controller";

const router = Router();

router.post("/login", validate({ body: loginSchema }), loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.get("/me", authenticate, meHandler);

export default router;
