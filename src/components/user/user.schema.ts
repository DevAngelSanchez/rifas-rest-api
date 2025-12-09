// src/types/schemas/user.ts (o la ruta donde manejes tus schemas)

import { z } from 'zod';
import { Role } from '../../generated/prisma/client';

// ----------------------------------------------------
// Esquema para la CREACIÓN de un usuario (Admin)
// ----------------------------------------------------
export const createUserSchema = z.object({
  email: z.string().email("Formato de email inválido."),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  name: z.string().min(1, 'El nombre no puede estar vacío.').optional(),

  // El rol debe ser uno de los definidos por Prisma
  role: z.nativeEnum(Role).default(Role.STUDENT),

  // Relaciones, deben ser CUIDs o nulos si no se asignan
  schoolId: z.string().cuid("ID de colegio inválido.").nullable().optional(),
  roomId: z.string().cuid("ID de sección inválido.").nullable().optional(),
}).refine(data => {
  // Lógica para asegurar que si se asigna un roomId, también debe haber un schoolId
  if (data.roomId && !data.schoolId) {
    return false;
  }
  return true;
}, {
  message: "No se puede asignar una sección (roomId) sin un colegio (schoolId).",
  path: ["roomId"], // Muestra el error en el campo roomId
});

// ----------------------------------------------------
// Esquema para la ACTUALIZACIÓN de un usuario
// ----------------------------------------------------
export const updateUserSchema = z.object({
  email: z.string().email("Formato de email inválido.").optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.').optional(),
  name: z.string().min(1, 'El nombre no puede estar vacío.').optional(),
  role: z.nativeEnum(Role).optional(),

  // Usamos z.string().cuid().nullable().optional() para permitir:
  // 1. No enviarlo (undefined)
  // 2. Enviarlo con un nuevo CUID (string)
  // 3. Enviarlo como null (para desvincularlo)
  schoolId: z.string().cuid("ID de colegio inválido.").nullable().optional(),
  roomId: z.string().cuid("ID de sección inválido.").nullable().optional(),
}).refine(data => {
  // Si se está actualizando roomId, debe haber (o estar actualizando) schoolId
  if (data.roomId !== undefined && data.roomId !== null && !data.schoolId) {
    return false;
  }
  return true;
}, {
  message: "No se puede asignar una sección (roomId) sin un colegio (schoolId).",
  path: ["roomId"],
}).refine(data => {
  // Asegura que al menos un campo sea proporcionado para la actualización
  return Object.keys(data).length > 0;
}, {
  message: "Se requiere al menos un campo para actualizar el usuario.",
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;