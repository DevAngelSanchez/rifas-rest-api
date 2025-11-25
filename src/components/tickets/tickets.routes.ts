// src/routes/ticket/ticket.routes.ts

import { Router } from "express";
import { protectRoute, isAdmin } from "../../middleware/auth.middleware";
import {
  getTicketsByRaffleId,
  getTicketById,
  getStudentTicketsForRaffle,
  assignTicket,
} from "./tickets.controller";

const router = Router();

// Rutas de visualización para el dueño/estudiante
// GET /tickets/my-tickets/:raffleId -> Ver mis tickets asignados para una rifa
router.get("/my-tickets", protectRoute, getStudentTicketsForRaffle);
router.put("/:ticketId/assign", protectRoute, assignTicket);

// Rutas de gestión (Admin)
router.use(protectRoute, isAdmin);

// GET /tickets/raffle/:raffleId -> Obtener todos los tickets de una rifa
router.get("/raffle/:raffleId", getTicketsByRaffleId);
// GET /tickets/:id -> Obtener un ticket individual (incluye validación de dueño)
router.get("/:id", getTicketById);


export default router;