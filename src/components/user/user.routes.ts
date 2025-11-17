// src/routes/user/user.routes.ts

import { Router } from "express";
import { protectRoute, isAdmin } from "../../middleware/auth.middleware";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from "./user.controller";

const router = Router();

// 🔐 Todas las rutas de gestión de usuarios requieren ser Admin
router.use(protectRoute, isAdmin);

// Rutas de Usuarios
router.get("/", getAllUsers);      // GET /users (con filtros opcionales: ?role=STUDENT&schoolId=...)
router.get("/:id", getUserById);   // GET /users/:id
router.post("/", createUser);      // POST /users
router.patch("/:id", updateUser);  // PATCH /users/:id
router.delete("/:id", deleteUser); // DELETE /users/:id

export default router;