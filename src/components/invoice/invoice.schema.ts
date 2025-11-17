// src/types/schemas/invoice.ts

import { z } from 'zod';
import { PaymentStatus } from '@prisma/client';

// Esquema para la acción de marcar un ticket como pagado (Creación de Factura)
export const markAsPaidSchema = z.object({
  // Método de pago: Ej. "Zelle", "Efectivo", "Transferencia", etc.
  paymentMethod: z.string({
    error: "El método de pago es requerido."
  }).min(1, 'El método de pago no puede estar vacío.'),

  // Referencia de la transacción (opcional)
  reference: z.string({
    error: "La referencia del pago es obligatoria"
  }).min(1)
});

// Esquema para actualizar el estado de una factura (Admin)
// Útil si el pago inicial fue PENDING y se confirma después a COMPLETED
export const updateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
});

export type MarkAsPaidInput = z.infer<typeof markAsPaidSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;