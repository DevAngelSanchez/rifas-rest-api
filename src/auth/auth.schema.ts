import { z } from 'zod'; // Importa el Enum generado por Prisma
import { Role } from '../generated/prisma/enums';

// Schema para el registro
export const registerSchema = z.object({
  // Zod se encarga de que el body de la request tenga esta forma
  body: z.object({
    email: z.string({
      error: 'El email es requerido',
    }).email('Email inválido'),

    password: z.string({
      error: 'La contraseña es requerida',
    }).min(6, 'La contraseña debe tener al menos 6 caracteres'),

    name: z.string().optional(),

    role: z.nativeEnum(Role).optional(),
  }),
});

// Schema para el login
export const loginSchema = z.object({
  body: z.object({
    identifier: z.string({
      error: 'El email es requerido',
    }),

    password: z.string({
      error: 'La contraseña es requerida',
    }).min(1, 'La contraseña es requerida'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];