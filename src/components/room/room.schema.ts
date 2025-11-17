// src/types/schemas/room.ts

import { z } from 'zod';

// Esquema base para crear una Room
export const createRoomSchema = z.object({
  name: z.string({
    error: "El nombre de la sección es requerido."
  }).min(1, 'El nombre no puede estar vacío.'),

  // schoolId es requerido para saber a qué colegio pertenece
  schoolId: z.string({
    error: "El ID del colegio es requerido."
  }).cuid("ID de colegio inválido."), // Asumiendo que usas CUIDs
});

// Esquema para actualizar una Room (todos los campos son opcionales)
export const updateRoomSchema = z.object({
  name: z.string().min(1, 'El nombre no puede estar vacío.').optional(),
  // schoolId NO se debería actualizar directamente después de la creación
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;