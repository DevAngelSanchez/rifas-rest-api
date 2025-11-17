// school.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../../utils/const';
import { createSchoolSchema, updateSchoolSchema } from './school.schema';

export const getAllSchools = async (req: Request, res: Response) => {
  try {
    const schools = await prisma.school.findMany({
      // Puedes incluir relaciones si son necesarias (ej: rooms, users)
      include: {
        _count: {
          select: { users: true, rooms: true } // Muestra cuántos usuarios y secciones tiene
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    if (schools.length === 0) {
      return res.status(200).json({
        message: "No hay colegios registrados aún.",
        schools: []
      });
    }

    return res.status(200).json({
      schools,
      count: schools.length
    });

  } catch (error) {
    console.error("Error 500 al obtener todos los colegios: ", error);
    return res.status(500).json({ message: "Algo salió mal al obtener los colegios." });
  }
};

export const getSchoolById = async (req: Request, res: Response) => {
  try {
    // 1. Obtener el ID desde los parámetros de la URL
    const id = req.params.id; // Asume que el endpoint es GET /schools/:id

    if (!id) {
      // Este caso debería ser manejado por la capa de rutas, pero es un buen chequeo
      return res.status(400).json({ message: 'ID del colegio requerido.' });
    }

    // 2. Buscar el colegio, incluyendo sus relaciones clave
    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        rooms: { // Incluye las secciones
          select: { id: true, name: true, createdAt: true, _count: { select: { users: true } } }
        },
        users: { // Incluye una lista básica de usuarios
          select: { id: true, name: true, role: true, email: true }
        }
      }
    });

    if (!school) {
      return res.status(404).json({ message: 'Colegio no encontrado o ID inválido.' });
    }

    return res.status(200).json({ school });

  } catch (error) {
    console.error("Error 500 al obtener el colegio por ID: ", error);
    return res.status(500).json({ message: "Algo salió mal al obtener el colegio." });
  }
};

export const createSchool = async (req: Request, res: Response) => {
  try {
    const validation = createSchoolSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues,
      });
    }

    const { name, address } = validation.data;

    await prisma.school.create({
      data: {
        name,
        address
      }
    })

    res.status(201).json({ message: 'Colegio creado.' });

  } catch (error) {
    console.log("Error 500 al crear colegio: ", error);
    return res.status(500).json({ message: "Algo salio mal creando el colegio." });
  }
};

export const updateSchool = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'ID del colegio requerido.' });
    }

    const validation = updateSchoolSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Datos de entrada inválidos para actualización',
        errors: validation.error.issues,
      });
    }

    const updateData = validation.data;

    const updatedSchool = await prisma.school.update({
      where: { id },
      data: updateData, // Usa los datos validados directamente
    });

    return res.status(200).json({
      message: "Datos del colegio actualizados",
      school: updatedSchool
    });

  } catch (error: any) {
    if (error.code === 'P2025') { // Código de Prisma para "Record to update not found"
      return res.status(404).json({ message: "No se encontró el colegio o ID inválido." });
    }
    // Manejo de error de unicidad (P2002) si name ya existe
    console.error("Error 500 al actualizar colegio: ", error);
    return res.status(500).json({ message: "Algo salió mal actualizando el colegio." });
  }
}

export const deleteSchool = async (req: Request, res: Response) => {
  try {
    // 1. Obtener el ID desde los parámetros de la URL
    const { id } = req.params; // Asume que el endpoint es DELETE /schools/:id

    // 2. Validación simple (puedes usar un schema si quieres validar el formato CUID)
    if (!id) {
      return res.status(400).json({ message: 'ID del colegio requerido.' });
    }

    // 3. Eliminar (Prisma fallará si no lo encuentra)
    await prisma.school.delete({ where: { id } });

    return res.status(200).json({ message: "Colegio eliminado exitosamente." });

  } catch (error: any) {
    // Capturar el error P2025 (Record not found)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'No se encontró el colegio o ID inválido.' });
    }
    console.error("Error 500 al eliminar colegio: ", error);
    return res.status(500).json({ message: "Algo salió mal eliminando el colegio." });
  }
}