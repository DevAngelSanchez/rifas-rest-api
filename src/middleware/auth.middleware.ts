import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types/express'; // Importamos nuestro tipo
import { Role } from '../generated/prisma/client';

/**
 * 🔐 protectRoute: Middleware de Autenticación
 *
 * Verifica el token JWT en el encabezado de 'Authorization'.
 * Si es válido, extrae el payload y lo adjunta a 'req.user'.
 * Si no es válido o no existe, devuelve un error 401.
 */
export const protectRoute = (req: Request, res: Response, next: NextFunction) => {
  try {

    let token: string | undefined = req.header("Authorization")?.split(' ')[1];

    // 2. Si no se encontró en el encabezado, buscar en la cookie
    if (!token && req.cookies && req.cookies.jwt_token) {
      token = req.cookies.jwt_token;
    }

    // 3. ¡Verificación de no nulo/undefined!
    if (!token) {
      return res.status(401).json({ message: "Acceso denegado: No se proporcionó token de autorización." });
    }

    // 4. Verificar y decodificar el token
    // TypeScript ahora sabe que 'token' es definitivamente un string.
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as UserPayload;

    // 5. ¡Éxito! Adjuntamos el payload del usuario
    req.user = payload;

    // 6. Pasamos al siguiente middleware o controlador
    next();

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expirado.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Token no válido.' });
    }

    console.error("Error en protectRoute:", error);
    return res.status(401).json({ message: 'No autorizado.' });
  }
};

/**
 * 👮 isAdmin: Middleware de Autorización (Rol)
 *
 * Verifica que el usuario (previamente validado por 'protectRoute')
 * tenga el rol de 'ADMIN'.
 * * IMPORTANTE: Este middleware DEBE ejecutarse DESPUÉS de 'protectRoute'.
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  // 1. Asumimos que 'protectRoute' ya se ejecutó y 'req.user' existe.
  if (!req.user) {
    // Esto es un "por si acaso" o un error de lógica en el orden de los middlewares
    return res.status(401).json({ message: 'No autenticado (error de middleware).' });
  }

  // 2. Verificar el rol
  if (req.user.role !== Role.ADMIN) {
    // 403 Forbidden: Estás autenticado, pero no tienes permiso.
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
  }

  // 3. ¡Éxito! El usuario es Admin.
  next();
};