import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createProjectHandler,
  createProjectSchema,
  getProjectHandler,
  listProjectsHandler,
} from "../controllers/project.controller";

const router = Router();

router.use(authenticate);

router.get("/", authorize("ADMIN", "PM"), listProjectsHandler);
router.post("/", authorize("ADMIN", "PM"), validate({ body: createProjectSchema }), createProjectHandler);
router.get("/:id", getProjectHandler); // fine-grained access enforced in the service layer

export default router;
