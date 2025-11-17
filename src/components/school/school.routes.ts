// src/routes/school.routes.ts

import { Router } from "express";
import { protectRoute, isAdmin } from "../../middleware/auth.middleware"; // Asegúrate de que isAdmin esté exportado
import {
  createSchool,
  getAllSchools,
  getSchoolById,
  updateSchool,
  deleteSchool
} from "./school.controller";

const router = Router();

// Todas estas rutas requieren autenticación y el rol ADMIN
router.use(protectRoute, isAdmin);

// Rutas de Colegios
router.get("/", getAllSchools);
router.get("/:id", getSchoolById);
router.post("/", createSchool);
router.patch("/:id", updateSchool);
router.delete("/:id", deleteSchool);

export default router;