// src/routes/user/user.controller.ts

import { Request, Response } from 'express';
import { prisma } from '../../utils/const'; // Asumiendo que esta es tu instancia de Prisma Client
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { createUserSchema, updateUserSchema } from './user.schema';
import z from 'zod';

const generateSimplePassword = (fullName: string): string => {
  const initial = fullName.trim().charAt(0).toUpperCase();
  return `${initial}12345678`;
};

export const studentSchema = z.object({
  name: z.string().min(2, "Nombre completo requerido."),
  username: z.string().min(3, "Nombre de usuario requerido.").regex(/^[a-zA-Z0-9_.]+$/, "El usuario solo puede contener letras, números, puntos y guiones bajos."),
  email: z.string().email("Correo electrónico inválido.").optional().or(z.literal('')), // Email opcional
  phone: z.string().optional(),
});

// --- D. Esquema para la carga masiva de Estudiantes ---
// Este es el tipo que contendrá el array de estudiantes a enviar.
export const bulkStudentSchema = z.object({
  roomId: z.string().min(1, "Debe seleccionar la sección (room) para asignar estos estudiantes."),
  students: z.array(studentSchema).min(1, "Debe añadir al menos un estudiante."),
});


// ----------------------------------------------------
// 📚 OBTENER TODOS LOS USUARIOS (con filtros)
// ----------------------------------------------------
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { role, schoolId, roomId } = req.query;

    // Construir la cláusula WHERE dinámicamente
    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role as Role;
    if (schoolId) where.schoolId = String(schoolId);
    if (roomId) where.roomId = String(roomId);

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        school: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        // No incluir datos sensibles o hashes de contraseña
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      users,
      count: users.length
    });

  } catch (error) {
    console.error("Error 500 al obtener usuarios: ", error);
    return res.status(500).json({ message: "Algo salió mal al obtener los usuarios." });
  }
};

// ----------------------------------------------------
// 🔎 OBTENER USUARIO POR ID
// ----------------------------------------------------
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        school: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        tickets: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    return res.status(200).json({ user });

  } catch (error) {
    console.error("Error 500 al obtener usuario por ID: ", error);
    return res.status(500).json({ message: "Algo salió mal al obtener el usuario." });
  }
};

// ----------------------------------------------------
// ➕ CREAR USUARIO (Solo Admin puede crear otros Admins/Students)
// ----------------------------------------------------
export const createUser = async (req: Request, res: Response) => {
  try {
    const validation = createUserSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues,
      });
    }

    const { email, password, name, role, schoolId, roomId } = validation.data;

    // 1. Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // 2. Verificar existencia de School y Room si son proporcionados
    if (schoolId) {
      const school = await prisma.school.findUnique({ where: { id: schoolId } });
      if (!school) return res.status(400).json({ message: "ID de colegio inválido." });
    }
    if (roomId) {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) return res.status(400).json({ message: "ID de sección (room) inválido." });
    }

    // 3. Hashear la contraseña (asume que tienes saltRounds en utils/const)
    const saltRounds = 10; // Usar una constante de tu archivo utils/const
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Crear el usuario
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || Role.STUDENT, // Por defecto, creamos estudiantes
        schoolId,
        roomId
      },
      select: {
        id: true, email: true, name: true, role: true, createdAt: true, schoolId: true, roomId: true
      }
    });

    res.status(201).json({ message: 'Usuario creado exitosamente.', user: newUser });

  } catch (error) {
    console.error("Error 500 al crear usuario: ", error);
    return res.status(500).json({ message: "Algo salió mal creando el usuario." });
  }
};

export const createStudentBulk = async (req: Request, res: Response) => {
  try {
    // Validación del payload completo
    const validation = bulkStudentSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues,
      });
    }

    const { roomId, students } = validation.data;
    const saltRounds = 10; // Usar una constante de tu archivo utils/const

    // 1. Verificar existencia de Room
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(400).json({ message: "ID de sección (room) inválido. Los estudiantes no pueden ser asignados." });
    }

    // 2. Verificar unicidad de username y preparar datos para la creación
    const usernames = students.map(s => s.username);
    const existingUsers = await prisma.user.findMany({
      where: { username: { in: usernames } },
      select: { username: true }
    });

    if (existingUsers.length > 0) {
      const existingUsernames = existingUsers.map(u => u.username);
      return res.status(400).json({
        message: `Los siguientes nombres de usuario ya están registrados: ${existingUsernames.join(', ')}`,
      });
    }

    // 3. Hashear contraseñas y preparar datos de inserción masiva
    const studentsToCreate = await Promise.all(students.map(async (student) => {
      const simplePassword = generateSimplePassword(student.name);
      const hashedPassword = await bcrypt.hash(simplePassword, saltRounds);

      return {
        username: student.username,
        password: hashedPassword,
        name: student.name,
        phone: student.phone,
        role: Role.STUDENT,
        roomId: roomId,
        schoolId: room.schoolId, // Se hereda del Room
      };
    }));

    // 4. Crear los estudiantes en una transacción
    const newUsers = await prisma.user.createMany({
      data: studentsToCreate,
      skipDuplicates: true, // Aunque ya verificamos, es una buena práctica
    });

    res.status(201).json({
      message: `${newUsers.count} estudiantes creados y asignados a la sección ${room.name}.`,
      count: newUsers.count
    });

  } catch (error) {
    console.error("Error 500 al crear estudiantes en bulk: ", error);
    return res.status(500).json({ message: "Algo salió mal creando los estudiantes." });
  }
};

// ----------------------------------------------------
// ✏️ ACTUALIZAR USUARIO
// ----------------------------------------------------
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateUserSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Datos de entrada inválidos para actualización',
        errors: validation.error.issues,
      });
    }

    const updateData = validation.data;
    const { password, schoolId, roomId, email, ...restOfData } = updateData;

    // 1. Manejo especial de la contraseña
    if (password) {
      const saltRounds = 10; // Usar la misma constante
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    // 2. Manejo de relaciones (verificar que existan si se van a actualizar)
    if (schoolId !== undefined) {
      // Si schoolId es null, no verifica existencia, solo actualiza
      if (schoolId !== null) {
        const school = await prisma.school.findUnique({ where: { id: schoolId } });
        if (!school) return res.status(400).json({ message: "ID de colegio inválido." });
      }
      updateData.schoolId = schoolId;
    }

    if (roomId !== undefined) {
      if (roomId !== null) {
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) return res.status(400).json({ message: "ID de sección (room) inválido." });
      }
      updateData.roomId = roomId;
    }

    // 3. Actualizar
    const updatedUser = await prisma.user.update({
      where: { id },
      data: restOfData,
      select: { id: true, email: true, name: true, role: true, schoolId: true, roomId: true }
    });

    return res.status(200).json({
      message: "Usuario actualizado.",
      user: updatedUser
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: "Usuario no encontrado o ID inválido." });
    }
    if (error.code === 'P2002') { // Error de unicidad (ej: email)
      return res.status(400).json({ message: 'El nuevo correo electrónico ya está en uso.' });
    }
    console.error("Error 500 al actualizar usuario: ", error);
    return res.status(500).json({ message: "Algo salió mal actualizando el usuario." });
  }
}

// ----------------------------------------------------
// 🗑️ ELIMINAR USUARIO
// ----------------------------------------------------
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ¡IMPORTANTE! Si un usuario se elimina, sus tickets (TicketOwner: onDelete: Cascade)
    // y sus facturas (Invoice: onDelete: Restrict) también deben ser considerados.
    // Dado el esquema actual, la eliminación en cascada es automática para tickets.

    await prisma.user.delete({ where: { id } });

    return res.status(200).json({ message: "Usuario eliminado exitosamente." });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Usuario no encontrado o ID inválido.' });
    }
    // Manejo de error de restricción (ej: si hay facturas asociadas y se usa RESTRICT)
    if (error.code === 'P2003') {
      return res.status(400).json({ message: 'No se puede eliminar este usuario porque tiene registros de pagos (facturas) asociados.' });
    }
    console.error("Error 500 al eliminar usuario: ", error);
    return res.status(500).json({ message: "Algo salió mal eliminando el usuario." });
  }
}