// src/routes/invoice/invoice.routes.ts

import { Router } from "express";
import { protectRoute, isAdmin } from "../../middleware/auth.middleware";
import {
  markTicketAsPaid,
  getAllInvoices,
  getInvoiceById,
} from "./invoice.controller";

const router = Router();

// 1. Acción de Pago (Requiere autenticación)
// PATCH /invoices/pay/:ticketId -> Marcar un ticket como pagado y crear factura
router.patch("/pay/:ticketId", protectRoute, markTicketAsPaid);

// 2. Rutas de visualización general (Solo para Admins)
router.get("/", protectRoute, isAdmin, getAllInvoices);

// 3. Ver factura individual (Requiere autenticación, valida dueño en el controller)
router.get("/:id", protectRoute, getInvoiceById);

export default router;