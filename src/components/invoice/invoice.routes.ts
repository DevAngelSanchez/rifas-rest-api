// src/routes/invoice/invoice.routes.ts

import { Router } from "express";
import { protectRoute, isAdmin } from "../../middleware/auth.middleware";
import {
  getAllInvoices,
  getInvoiceById,
  submitPayment,
  uploadPaymentProof,
} from "./invoice.controller";

const router = Router();

// 1. Acción de Pago (Requiere autenticación)
// PATCH /invoices/pay/:ticketId -> Marcar un ticket como pagado y crear factura
router.post(
  '/submit-payment',         // 1. Verifica que el usuario esté logueado (Adjunta req.user)
  protectRoute,
  uploadPaymentProof,      // 2. Procesa el archivo (multipart/form-data) con Multer (Adjunta req.file)
  submitPayment            // 3. Valida datos, crea la Invoice y actualiza los Tickets
);

// 2. Rutas de visualización general (Solo para Admins)
router.get("/", protectRoute, isAdmin, getAllInvoices);

// 3. Ver factura individual (Requiere autenticación, valida dueño en el controller)
router.get("/:id", protectRoute, getInvoiceById);

export default router;