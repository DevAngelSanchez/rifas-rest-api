import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentStatus } from '@prisma/client';

// Función para validar Decimal (necesario si Zod no soporta directamente el tipo Decimal de Prisma)
const decimalValidation = z.custom<Decimal>(val => {
  try {
    // Acepta Decimal object, string o number (que luego convertimos a Decimal)
    return val instanceof Decimal || typeof val === 'string' || typeof val === 'number';
  } catch {
    return false;
  }
}, { message: "El valor debe ser un número válido." });


export const submitPaymentSchema = z.object({
  // Identificación de Tickets
  ticketIds: z.array(z.string().cuid()).min(1, "Debe seleccionar al menos un ticket para pagar."),

  // Datos del Comprador (para actualizar en los tickets)
  ownerName: z.string().min(5, "Nombre del propietario es obligatorio.").max(100),
  ownerPhone: z.string().regex(/^\+?[\d\s-]{7,15}$/, "Número de teléfono inválido.").optional(),

  // Datos Financieros
  paymentMethod: z.string().min(1, "El método de pago es obligatorio."),
  reference: z.string().optional(),

  // Montos: Decimales son obligatorios
  totalAmount: decimalValidation,
  amountBss: decimalValidation.optional(),
  amountUsd: decimalValidation.optional(),

  // Tasa BCV: Requerido solo para ciertos métodos (ej: Transferencia)

  // El 'proofUrl' se gestiona fuera de Zod ya que es el resultado de Multer.

}).superRefine((data, ctx) => {
  // Lógica condicional: Si es 'Transferencia' o 'Pago Móvil', el BCV y BSS deben estar presentes.
  if (data.paymentMethod === 'Transferencia' || data.paymentMethod === 'Pago Móvil') {
    if (!data.amountBss) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El monto en BsS es requerido para pagos electrónicos.",
        path: ['amountBss'],
      });
    }
  }
  // Lógica condicional: Si es 'Efectivo USD', el monto USD debe estar presente.
  if (data.paymentMethod === 'Efectivo USD') {
    if (!data.amountUsd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El monto en USD es requerido para pagos en efectivo.",
        path: ['amountUsd'],
      });
    }
  }
});

// Esquema para actualizar el estado de una factura (Admin)
// Útil si el pago inicial fue PENDING y se confirma después a COMPLETED
export const updateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
});


export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;