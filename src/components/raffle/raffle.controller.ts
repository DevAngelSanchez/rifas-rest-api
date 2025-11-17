// src/routes/raffle/raffle.controller.ts

import { Request, Response } from 'express';
import { prisma } from '../../utils/const';
import { Role, RaffleStatus, Prisma, TicketStatus } from '@prisma/client';
import { createRaffleSchema, updateRaffleSchema } from './raffle.schema';

// ----------------------------------------------------
// ➕ CREAR RIFA Y ASIGNAR TICKETS AUTOMÁTICAMENTE
// ----------------------------------------------------
export const createRaffle = async (req: Request, res: Response) => {
  try {
    // 1. Validar la entrada (Solo ADMIN puede llegar aquí)
    const validation = createRaffleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues,
      });
    }

    const { title, prize, ticketPrice, totalTickets, schoolId, description, drawDate } = validation.data;
    const organizerId = req.user!.id; // Obtenido del token por protectRoute/isAdmin

    // 2. Buscar todos los estudiantes del colegio especificado
    const students = await prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        schoolId: schoolId,
        // Opcional: Podrías querer filtrar solo estudiantes activos, etc.
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' } // Asignar tickets en un orden predecible
    });

    if (students.length === 0) {
      return res.status(400).json({
        message: 'No hay estudiantes registrados en este colegio para asignar los tickets.'
      });
    }

    // 3. Lógica de asignación de tickets
    const numStudents = students.length;
    const baseTicketsPerStudent = Math.floor(totalTickets / numStudents); // Ej: 100 / 3 = 33
    let remainingTickets = totalTickets % numStudents; // Ej: 100 % 3 = 1 (el sobrante)

    const studentsWithTickets = students.map((student, index) => {
      // El último estudiante (o los primeros 'remainingTickets' si quieres una distribución más justa)
      // recibe el sobrante. Usaremos el último para simplicidad.
      const additionalTicket = (index === numStudents - 1) && remainingTickets > 0 ? remainingTickets : 0;
      const assignedTickets = baseTicketsPerStudent + additionalTicket;

      // Si quieres distribuir el sobrante equitativamente:
      // const isReceiverOfRemainder = index < remainingTickets;
      // const assignedTickets = baseTicketsPerStudent + (isReceiverOfRemainder ? 1 : 0);

      // Esto es solo para la info del array temporal
      return {
        ownerId: student.id,
        count: assignedTickets
      };
    }).filter(item => item.count > 0); // Filtra estudiantes con 0 tickets si totalTickets < numStudents

    // 4. Crear la Rifa y todos los Tickets dentro de una transacción
    let currentTicketNumber = 1;
    const ticketCreationData: Prisma.TicketCreateManyRaffleInput[] = [];

    for (const assignment of studentsWithTickets) {
      for (let i = 0; i < assignment.count; i++) {
        ticketCreationData.push({
          number: currentTicketNumber++,
          ownerId: assignment.ownerId,
          status: TicketStatus.PENDING, // Estado inicial
        });
      }
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // A. Crear la Rifa
      const newRaffle = await tx.raffle.create({
        data: {
          title,
          description,
          prize,
          ticketPrice,
          drawDate: drawDate ? new Date(drawDate) : null,
          organizerId,
          status: RaffleStatus.DRAFT, // Empieza como borrador
        }
      });

      // B. Crear los tickets asociados a esa Rifa
      // Usamos createMany, que es más rápido que crear uno por uno
      await tx.ticket.createMany({
        data: ticketCreationData.map(ticket => ({
          ...ticket,
          raffleId: newRaffle.id,
        }))
      });

      return newRaffle;
    });

    res.status(201).json({
      message: `Rifa '${transaction.title}' creada con ${ticketCreationData.length} tickets asignados.`,
      raffle: transaction
    });

  } catch (error) {
    console.error("Error 500 al crear la rifa: ", error);
    return res.status(500).json({ message: "Algo salió mal creando la rifa y los tickets." });
  }
};

// ----------------------------------------------------
// 📚 OBTENER TODAS LAS RIFAS
// ----------------------------------------------------
export const getAllRaffles = async (req: Request, res: Response) => {
  try {
    // Se puede filtrar por status, schoolId, etc.
    const { status } = req.query;

    const where: Prisma.RaffleWhereInput = {};
    if (status) where.status = status as RaffleStatus;

    const raffles = await prisma.raffle.findMany({
      where,
      include: {
        _count: { select: { ticketsSold: true } },
        organizer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    // Opcional: calcular cuántos tickets están PAGADOS vs PENDING para cada rifa (requiere un query más complejo)

    return res.status(200).json({ raffles, count: raffles.length });

  } catch (error) {
    console.error("Error 500 al obtener rifas: ", error);
    return res.status(500).json({ message: "Algo salió mal al obtener las rifas." });
  }
};

// ----------------------------------------------------
// 🔎 OBTENER RIFA POR ID
// ----------------------------------------------------
export const getRaffleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const raffle = await prisma.raffle.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, name: true } },
        ticketsSold: { // Opcional: incluir una lista de todos los tickets
          select: { id: true, number: true, status: true, owner: { select: { id: true, name: true, room: true } } },
          orderBy: { number: 'asc' }
        },
        winner: { // Incluir información del ticket ganador si existe
          select: { number: true, owner: { select: { name: true, email: true } } }
        }
      }
    });

    if (!raffle) {
      return res.status(404).json({ message: 'Rifa no encontrada.' });
    }

    // Opcional: Agregar contadores de tickets
    const paidTicketsCount = raffle.ticketsSold.filter(t => t.status === TicketStatus.PAID).length;
    const pendingTicketsCount = raffle.ticketsSold.filter(t => t.status === TicketStatus.PENDING).length;

    return res.status(200).json({
      raffle,
      stats: {
        totalTickets: raffle.ticketsSold.length,
        paidTickets: paidTicketsCount,
        pendingTickets: pendingTicketsCount,
        // Podrías calcular la ganancia potencial y actual aquí
      }
    });

  } catch (error) {
    console.error("Error 500 al obtener rifa por ID: ", error);
    return res.status(500).json({ message: "Algo salió mal al obtener la rifa." });
  }
};

// ----------------------------------------------------
// ✏️ ACTUALIZAR RIFA
// ----------------------------------------------------
export const updateRaffle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateRaffleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Datos de entrada inválidos para actualización',
        errors: validation.error.issues,
      });
    }

    const updateData = validation.data;

    // Conversión de Decimal y Date para Prisma
    const prismaUpdateData: Prisma.RaffleUpdateInput = {
      ...updateData,
      drawDate: updateData.drawDate ? new Date(updateData.drawDate) : undefined,
    };

    const updatedRaffle = await prisma.raffle.update({
      where: { id },
      data: prismaUpdateData,
      select: { id: true, title: true, status: true, updatedAt: true }
    });

    return res.status(200).json({
      message: "Rifa actualizada.",
      raffle: updatedRaffle
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: "Rifa no encontrada o ID inválido." });
    }
    console.error("Error 500 al actualizar rifa: ", error);
    return res.status(500).json({ message: "Algo salió mal actualizando la rifa." });
  }
}

// ----------------------------------------------------
// 🗑️ ELIMINAR RIFA
// ----------------------------------------------------
export const deleteRaffle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // La eliminación de la rifa dispara la eliminación en cascada de todos los Tickets asociados
    // (ver schema.prisma: onDelete: Cascade)
    await prisma.raffle.delete({ where: { id } });

    return res.status(200).json({ message: "Rifa y todos sus tickets eliminados exitosamente." });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Rifa no encontrada o ID inválido.' });
    }
    console.error("Error 500 al eliminar rifa: ", error);
    return res.status(500).json({ message: "Algo salió mal eliminando la rifa." });
  }
}