// src/routes/invoice/invoice.controller.ts

import { Request, Response } from 'express';
import { prisma } from '../../utils/const';
import { TicketStatus, PaymentStatus, Prisma } from '@prisma/client';
import { markAsPaidSchema, updateInvoiceStatusSchema } from './invoice.schema';

// ----------------------------------------------------
// 💵 MARCAR TICKET COMO PAGADO (y crear factura)
// PATCH /invoices/pay/:ticketId
// ----------------------------------------------------
export const markTicketAsPaid = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const validation = markAsPaidSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Datos de pago inválidos',
        errors: validation.error.issues,
      });
    }

    const { paymentMethod, reference } = validation.data;
    const actingUserId = req.user!.id; // Usuario que registra el pago (Admin o Dueño del Ticket)

    // 1. Obtener el ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { raffle: true }
    });

    if (!ticket || !ticket.raffle) {
      return res.status(404).json({ message: "Ticket no encontrado." });
    }
    if (ticket.status === TicketStatus.PAID) {
      return res.status(400).json({ message: "Este ticket ya ha sido pagado y facturado." });
    }

    // 2. Ejecutar la Transacción: Crear Factura y Actualizar Ticket
    const rafflePrice = ticket.raffle.ticketPrice;

    const transactionResult = await prisma.$transaction(async (tx) => {

      // A. Crear la Factura
      const newInvoice = await tx.invoice.create({
        data: {
          totalAmount: rafflePrice,
          status: PaymentStatus.COMPLETED, // Asumimos pago completado al registrar
          paymentMethod,
          reference,
          userId: ticket.ownerId, // La factura es para el dueño del ticket
        }
      });

      // B. Actualizar el estado del Ticket, enlazándolo a la factura
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.PAID,
          invoiceId: newInvoice.id,
        },
        select: { id: true, number: true, status: true, ownerId: true }
      });

      return { newInvoice, updatedTicket };
    });

    res.status(200).json({
      message: `Ticket #${ticket.number} marcado como pagado. Factura creada exitosamente.`,
      invoice: transactionResult.newInvoice,
    });

  } catch (error) {
    console.error("Error 500 al marcar ticket como pagado:", error);
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