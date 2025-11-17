// src/routes/room/room.routes.ts

import { Router } from "express";
import { protectRoute, isAdmin } from "../../middleware/auth.middleware";
import {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom
} from "./room.controller";

const router = Router();

// Todas estas rutas requieren autenticación y el rol ADMIN para la gestión
router.use(protectRoute, isAdmin);

// Rutas de Secciones (Rooms)
router.get("/", getAllRooms);      // GET /rooms?schoolId=...
router.get("/:id", getRoomById);   // GET /rooms/:id
router.post("/", createRoom);      // POST /rooms
router.patch("/:id", updateRoom);  // PATCH /rooms/:id
router.delete("/:id", deleteRoom); // DELETE /rooms/:id

export default router;