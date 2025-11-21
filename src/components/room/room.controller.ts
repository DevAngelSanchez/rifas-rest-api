// src/routes/room/room.controller.ts

import { Request, Response } from 'express';
import { prisma } from '../../utils/const';
import { createRoomSchema, updateRoomSchema } from './room.schema';
import { Prisma } from '@prisma/client';

/**
 * 📚 Obtener todas las secciones (opcionalmente filtradas por schoolId)
 */
export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query; // Permite filtrar por query param

    const rooms = await prisma.room.findMany({
      where: schoolId ? { schoolId: String(schoolId) } : {},
      include: {
        school: { select: { id: true, name: true } }, // Incluir el nombre del colegio
        _count: {
          select: { users: true } // Contar cuántos usuarios tiene la sección
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({ rooms, count: rooms.length });

  } catch (error) {
    console.error("Error 500 al obtener todas las secciones: ", error);
    return res.status(500).json({ message: "Algo salió mal al obtener las secciones." });
  }
};

/**
 * 📚 Obtener una sección por ID
 */
export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true } },
        users: { // Listar usuarios de la sección
          select: { id: true, name: true, username: true, email: true, role: true }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ message: 'Sección no encontrada o ID inválido.' });
    }

    return res.status(200).json({ room });

  } catch (error) {
    console.error("Error 500 al obtener la sección por ID: ", error);
    return res.status(500).json({ message: "Algo salió mal al obtener la sección." });
  }
};

export const getRoomsBySchoolId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rooms = await prisma.room.findMany({
      where: { schoolId: id },
      include: {
        school: { select: { id: true, name: true } },
        users: { // Listar usuarios de la sección
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    if (!rooms) {
      return res.status(404).json({ message: 'Secciones no encontradas o ID inválido.' });
    }

    return res.status(200).json({ rooms });

  } catch (error) {
    console.error("Error 500 al obtener las secciones por Colegio: ", error);
    return res.status(500).json({ message: "Algo salió mal al obtener la sección." });
  }
};

/**
 * ➕ Crear una nueva sección
 */
export const createRoom = async (req: Request, res: Response) => {
  try {
    const validation = createRoomSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues,
      });
    }

    const { name, schoolId } = validation.data;

    // 1. Verificar si el colegio existe
    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      return res.status(404).json({ message: 'El ID del colegio proporcionado no existe.' });
    }

    // 2. Crear la sección (Prisma maneja el @@unique([name, schoolId]))
    const newRoom = await prisma.room.create({
      data: { name, schoolId },
    });

    res.status(201).json({
      message: 'Sección creada exitosamente.',
      room: newRoom
    });

  } catch (error: any) {
    // P2002: Error de unicidad (ya existe una sección con ese nombre en ese colegio)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(400).json({ message: 'Ya existe una sección con ese nombre en este colegio.' });
    }
    console.error("Error 500 al crear sección: ", error);
    return res.status(500).json({ message: "Algo salió mal creando la sección." });
  }
};

/**
 * ✏️ Actualizar una sección existente
 */
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'ID de la sección requerido.' });
    }

    const validation = updateRoomSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Datos de entrada inválidos para actualización',
        errors: validation.error.issues,
      });
    }

    const updateData = validation.data;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'Se requiere al menos un campo para actualizar.' });
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      message: "Sección actualizada",
      room: updatedRoom
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: "No se encontró la sección o ID inválido." });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Ya existe una sección con ese nombre en ese colegio.' });
    }
    console.error("Error 500 al actualizar sección: ", error);
    return res.status(500).json({ message: "Algo salió mal actualizando la sección." });
  }
}

/**
 * 🗑️ Eliminar una sección
 */
export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'ID de la sección requerido.' });
    }

    // Si la sección tiene usuarios asociados, se borra el roomId de esos usuarios (SetNull)
    // por la configuración en el schema.prisma. No necesitamos borrar usuarios.
    await prisma.room.delete({ where: { id } });

    return res.status(200).json({ message: "Sección eliminada exitosamente." });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'No se encontró la sección o ID inválido.' });
    }
    console.error("Error 500 al eliminar sección: ", error);
    return res.status(500).json({ message: "Algo salió mal eliminando la sección." });
  }
}