// src/routes/user/user.controller.ts

import { Request, Response } from 'express';
import { prisma } from '../../utils/const'; // Asumiendo que esta es tu instancia de Prisma Client
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { createUserSchema, updateUserSchema } from './user.schema';

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
        ticketsBuyed: { // Incluye una lista básica de tickets
          select: { id: true, number: true, status: true, raffle: { select: { title: true } } }
        }
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