import { z } from "zod";

const IdSchema = z.string().cuid({ message: "ID inválido (CUID esperado)." });

// 1. Schema para CREAR (Campos requeridos)
export const createSchoolSchema = z.object({
  name: z.string().min(3, "El nombre es obligatorio y debe tener al menos 3 caracteres."),
  address: z.string().optional(),
});

// 2. Schema para ACTUALIZAR (Campos opcionales)
// Usamos .partial() o definimos cada campo como .optional()
export const updateSchoolSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").optional(),
  address: z.string().optional(),
}).refine(data => data.name !== undefined || data.address !== undefined, {
  message: "Debe proporcionar al menos 'name' o 'address' para actualizar.",
});