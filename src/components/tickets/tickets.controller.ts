// src/routes/ticket/ticket.controller.ts

import { Request, Response } from 'express';
import { prisma } from '../../utils/const';
import { Prisma, TicketStatus } from '@prisma/client';

// ----------------------------------------------------
// 📚 OBTENER TODOS LOS TICKETS POR RIFA (Admin View)
// ----------------------------------------------------
export const getTicketsByRaffleId = async (req: Request, res: Response) => {
  try {
    const { raffleId } = req.params;
    const { status } = req.query;

    const where: Prisma.TicketWhereInput = {
      raffleId: raffleId,
    };

    if (status) where.status = status as TicketStatus;

    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        number: true,
        status: true,
        user: {
          select: { id: true, name: true, room: { select: { name: true } } }
        },
      },
      orderBy: { number: 'asc' }
    });

    return res.status(200).json({ tickets, count: tickets.length });

  } catch (error: any) {
    console.error("Error 500 al obtener tickets: ", error);
    return res.status(500).json({ message: "Algo salió mal al obtener los tickets." });
  }
};

// ----------------------------------------------------
// 🔎 OBTENER TICKET POR ID (Admin/Owner)
// ----------------------------------------------------
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        raffle: { select: { title: true, prize: true, ticketPrice: true } },
        user: { select: { id: true, name: true, room: { select: { name: true } } } },
        invoice: { select: { id: true, totalAmount: true, updatedAt: true } }
      }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado.' });
    }

    // ⚠️ Validación de propietario si no es Admin
    if (req.user!.role !== 'ADMIN' && ticket.userId !== userId) {
      return res.status(403).json({ message: 'Acceso denegado. Solo puedes ver tus propios tickets.' });
    }

    return res.status(200).json({ ticket });

  } catch (error) {
    console.error("Error 500 al obtener ticket por ID: ", error);
    return res.status(500).json({ message: "Algo salió mal al obtener el ticket." });
  }
};

// ----------------------------------------------------
// 👤 OBTENER TICKETS ASIGNADOS AL ESTUDIANTE (Owner View)
// ----------------------------------------------------
export const getStudentTicketsForRaffle = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const tickets = await prisma.ticket.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        number: true,
        status: true,
        raffle: { select: { title: true, ticketPrice: true } },
        ownerName: true,
        ownerPhone: true
      },
      orderBy: { number: 'asc' }
    });

    const totalPending = tickets.filter(t => t.status === TicketStatus.PENDING).length;
    const totalPaid = tickets.filter(t => t.status === TicketStatus.PAID).length;
    const totalTickets = tickets.length;

    return res.status(200).json({
      tickets,
      stats: { totalTickets, totalPaid, totalPending }
    });

  } catch (error) {
    console.error("Error 500 al obtener tickets del estudiante: ", error);
    return res.status(500).json({ message: "Algo salió mal al obtener tus tickets." });
  }
};

export const assignTicket = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { ownerName, ownerPhone } = req.body;

    if (!ownerName || ownerName.trim() === "") {
      return res.status(400).json({
        message: "El nombre del comprador es obligatorio",
      });
    }

    // 1️⃣ Verificar si el ticket existe
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    // 2️⃣ Evitar asignar tickets ya vendidos o cancelados
    if (ticket.status === "PAID") {
      return res.status(400).json({
        message: "Este ticket no se puede asignar",
      });
    }

    // 3️⃣ Actualizar ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ownerName,
        ownerPhone: ownerPhone || null,
        status: "ASSIGNED",
      },
      select: {
        id: true,
        number: true,
        status: true,
        ownerName: true,
        ownerPhone: true,
        raffleId: true,
      }
    });

    return res.status(200).json({
      message: "Ticket asignado correctamente",
      ticket: updatedTicket,
    });

  } catch (error: any) {
    console.error("Error al asignar ticket:", error);
    return res.status(500).json({
      message: "Algo salió mal al asignar el ticket",
    });
  }
};