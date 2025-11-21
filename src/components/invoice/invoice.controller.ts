// src/routes/invoice/invoice.controller.ts

import { Request, Response } from 'express';
import { prisma } from '../../utils/const';
import { TicketStatus, PaymentStatus, Prisma } from '@prisma/client';
import { submitPaymentSchema, updateInvoiceStatusSchema } from './invoice.schema';
import { uploadProof } from '../../middleware/multer.middleware';


interface CustomRequest extends Request {
  file?: Express.Multer.File;
}

export const uploadPaymentProof = uploadProof.single('proofFile');
// ----------------------------------------------------
// 💵 MARCAR TICKET COMO PAGADO (y crear factura)
// PATCH /invoices/pay/:ticketId
// ----------------------------------------------------
export const submitPayment = async (req: CustomRequest, res: Response) => {

  // 1. Obtener datos del archivo y usuario
  const proofUrl = req.file ? `/uploads/proofs/${req.file.filename}` : null;
  const userId = req.user!.id; // El estudiante que sube el pago

  // 2. Preparar el cuerpo para la validación de Zod
  // Nota: Multer parsea los campos de texto del FormData, pero los números y arrays pueden venir como strings.
  const body = {
    ...req.body,
    ticketIds: req.body.ticketIds ? JSON.parse(req.body.ticketIds) : [],
    totalAmount: req.body.totalAmount ? Number(req.body.totalAmount) : undefined,
    amountBss: req.body.amountBss ? Number(req.body.amountBss) : undefined,
    amountUsd: req.body.amountUsd ? Number(req.body.amountUsd) : undefined,
    bcvRate: req.body.bcvRate ? Number(req.body.bcvRate) : undefined,
  };

  try {
    // 3. Validación de Entrada
    const validation = submitPaymentSchema.safeParse(body);

    if (!validation.success) {
      // Si falla la validación, eliminar el archivo subido (se requiere libreria 'fs')
      // if (req.file) { fs.unlinkSync(req.file.path); }
      return res.status(400).json({
        message: 'Datos de pago incompletos o inválidos.',
        errors: validation.error.issues,
      });
    }

    const {
      ticketIds, ownerName, ownerPhone, totalAmount, paymentMethod, reference,
      amountBss, amountUsd, bcvRate
    } = validation.data;

    // 4. Verificar existencia de Tickets
    const tickets = await prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
      select: { id: true, status: true, raffle: { select: { ticketPrice: true } } }
    });

    if (tickets.length !== ticketIds.length) {
      return res.status(404).json({ message: "Uno o más tickets no fueron encontrados." });
    }
    if (tickets.some(t => t.status !== TicketStatus.PENDING)) {
      return res.status(400).json({ message: "Algunos tickets ya han sido pagados o están en revisión." });
    }

    // Opcional: Verificar que el totalAmount sea correcto basado en la suma de ticketPrices
    // const expectedTotal = tickets.reduce((sum, t) => sum.plus(t.raffle.ticketPrice), new Decimal(0));
    // if (!totalAmount.equals(expectedTotal)) { /* ... error ... */ }

    // 5. Ejecutar la Transacción: Crear Factura y Actualizar Tickets
    const transactionResult = await prisma.$transaction(async (tx) => {

      // A. Crear el Invoice
      const newInvoice = await tx.invoice.create({
        data: {
          userId, // Estudiante que sube el pago
          totalAmount,
          paymentMethod,
          reference,
          proofUrl, // URL del comprobante
          amountBss,
          amountUsd,
          bcvRate,
          status: PaymentStatus.PENDING, // Siempre PENDING para revisión del Admin
        }
      });

      // B. Actualizar los Tickets asociados
      await tx.ticket.updateMany({
        where: { id: { in: ticketIds } },
        data: {
          status: TicketStatus.PAID, // Nuevo estado
          invoiceId: newInvoice.id,
          ownerName,      // <-- Actualizamos OwnerName
          ownerPhone,     // <-- Actualizamos OwnerPhone
        }
      });

      return newInvoice;
    });

    res.status(201).json({
      message: `Pago de ${ticketIds.length} tickets enviado a revisión.`,
      invoice: transactionResult,
    });

  } catch (error) {
    // Si hay un error, intentar eliminar el archivo subido
    if (req.file) { /* Lógica para eliminar el archivo con fs.unlinkSync */ }
    console.error("Error 500 al enviar pago:", error);
    return res.status(500).json({ message: "Error interno al procesar el pago." });
  }
};

// ----------------------------------------------------
// 📑 OBTENER TODAS LAS FACTURAS (Admin View)
// ----------------------------------------------------
export const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const { status, userId } = req.query;

    const where: Prisma.InvoiceWhereInput = {};
    if (status) where.status = status as PaymentStatus;
    if (userId) where.userId = String(userId);

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, school: { select: { name: true } } } },
        tickets: {
          select: { number: true, raffle: { select: { title: true } } },
          take: 1 // Solo muestra 1 ticket de referencia si hay muchos
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ invoices, count: invoices.length });

  } catch (error) {
    console.error("Error 500 al obtener facturas:", error);
    return res.status(500).json({ message: "Algo salió mal al obtener las facturas." });
  }
};

// ----------------------------------------------------
// 🔎 OBTENER FACTURA POR ID
// ----------------------------------------------------
export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id; // Usuario autenticado

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        tickets: {
          select: { id: true, number: true, status: true, raffle: { select: { title: true, ticketPrice: true } } }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Factura no encontrada.' });
    }

    // Validación de Propietario: Solo ADMIN o el dueño de la factura pueden verla
    if (req.user!.role !== 'ADMIN' && invoice.userId !== userId) {
      return res.status(403).json({ message: 'Acceso denegado. Esta factura no te pertenece.' });
    }

    return res.status(200).json({ invoice });

  } catch (error) {
    console.error("Error 500 al obtener factura por ID:", error);
    return res.status(500).json({ message: "Algo salió mal al obtener la factura." });
  }
};