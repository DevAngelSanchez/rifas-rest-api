// src/types/schemas/raffle.ts

import { z } from 'zod';
import { RaffleStatus } from '../../generated/prisma/enums';

// ----------------------------------------------------
// Esquema para la CREACIÓN de una Rifa
// ----------------------------------------------------
export const createRaffleSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres."),
  description: z.string().optional(),
  prize: z.string().min(3, "El premio debe estar descrito."),

  // ticketPrice debe ser un número (Decimal en Prisma) y positivo
  ticketPrice: z.number().positive("El precio del ticket debe ser un valor positivo."),

  // drawDate debe ser una fecha futura
  drawDate: z.string().optional(),

  // Campo clave: Cantidad total de tickets a generar
  totalTickets: z.number().int().min(1, "La rifa debe tener al menos 1 ticket."),


  roomId: z.string().cuid("ID de colegio inválido."),
});

// ----------------------------------------------------
// Esquema para la ACTUALIZACIÓN de una Rifa
// ----------------------------------------------------
export const updateRaffleSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres.").optional(),
  description: z.string().optional(),
  prize: z.string().min(3, "El premio debe estar descrito.").optional(),
  ticketPrice: z.number().positive("El precio del ticket debe ser un valor positivo.").optional(),
  drawDate: z.string().datetime("Formato de fecha de sorteo inválido.").optional().or(z.literal(null)), // Permite null para borrar
  status: z.nativeEnum(RaffleStatus).optional(),
}).refine(data => {
  return Object.keys(data).length > 0;
}, {
  message: "Se requiere al menos un campo para actualizar la rifa.",
});

export type CreateRaffleInput = z.infer<typeof createRaffleSchema>;
export type UpdateRaffleInput = z.infer<typeof updateRaffleSchema>;