// src/routes/raffle/raffle.routes.ts

import { Router } from "express";
import { protectRoute, isAdmin } from "../../middleware/auth.middleware";
import {
  createRaffle,
  getAllRaffles,
  getRaffleById,
  updateRaffle,
  deleteRaffle,
  getRaffleSummary,
  getRaffleStudents,
  createRaffleExcel
} from "./raffle.controller";
import { getRaffleInvoices } from "../invoice/invoice.controller";

const router = Router();

// Rutas de gestión (CRUD) de Rifas - Solo para Admins
router.post("/", protectRoute, isAdmin, createRaffle);
router.patch("/:id", protectRoute, isAdmin, updateRaffle);
router.delete("/:id", protectRoute, isAdmin, deleteRaffle);

// Rutas de visualización (GET) - Pueden ser accesibles por todos (ADMIN y STUDENTS)
// Aunque podrías requerir autenticación para ver los detalles y tus tickets.
router.get("/", protectRoute, getAllRaffles);
router.get("/summary", protectRoute, getRaffleSummary);
router.get("/:id", protectRoute, getRaffleById);
router.get("/:id/students", protectRoute, getRaffleStudents);
router.get("/:raffleId/invoices", protectRoute, getRaffleInvoices);
router.get("/export-raffle/:id", createRaffleExcel);


export default router;