import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { loginSchema, registerSchema } from './auth.schema'; // Importamos los schemas
import { prisma, saltRounds } from '../utils/const';
import { Role } from '../generated/prisma/enums';

interface JwtPayload {
  id: string;
  role: Role;
  name: string;
}

// --- REGISTRO ---
export const register = async (req: Request, res: Response) => {
  try {
    // 1. Validar la entrada con Zod
    const validation = registerSchema.safeParse(req); // Validamos el 'req' completo

    if (!validation.success) {
      // safeParse no lanza error, nos da un objeto de error
      return res.status(400).json({
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues, // Errores detallados de Zod
      });
    }

    // Extraemos los datos validados del 'body'
    const { email, password, name, role } = validation.data.body;

    // 2. Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // 3. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Crear el usuario en la DB
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'ADMIN',
      },
    });

    // 5. No devolver la contraseña
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ message: 'Usuario creado exitosamente', user: userWithoutPassword });

  } catch (error: any) {
    console.error('Error en el registro:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// --- LOGIN ---
export const login = async (req: Request, res: Response) => {
  try {
    // 1. Validar la entrada (Asumimos que loginSchema valida { identifier: string, password: string })
    // Si tu esquema Zod aún usa { email: string, password: string }, lo usamos aquí:
    const validation = loginSchema.safeParse(req); // Cambiado a req.body si es un POST

    if (!validation.success) {
      return res.status(400).json({
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues,
      });
    }

    const { identifier, password } = validation.data.body; // Cambiamos el alias a identifier

    // 2. Buscar al usuario por email O nombre de usuario
    const user = await prisma.user.findFirst({ // findFirst es necesario aquí porque el filtro no es 'Unique'
      where: {
        OR: [
          { email: identifier },      // Intenta coincidir como email
          { username: identifier },   // Intenta coincidir como username
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    // 3. Comparar la contraseña (SIN CAMBIOS)
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    // 4. Crear el Payload del JWT (SIN CAMBIOS)
    const payload: JwtPayload = {
      id: user.id,
      role: user.role,
      name: user.name ? user.name : user.username || "Usuario" // Usamos username como fallback
    };

    // 5. Firmar y enviar el token (SIN CAMBIOS)
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET as string,
      { expiresIn: '8h' }
    );

    res.cookie('jwt_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Mejor práctica en producción
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : "lax", // Lax para dev, none para Prod
      maxAge: 1000 * 60 * 60 * 8,
    });

    res.status(200).json({
      message: 'Bienvenido',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        username: user.username, // Añadimos username a la respuesta
      },
    });

  } catch (error: any) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('jwt_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : "lax", // Lax para dev, none para Prod
  });
  return res.status(200).json({ message: "Sesion finalizada" });
};

export const checkAuthStatus = async (req: Request, res: Response) => {
  try {
    // ASUME que protectRoute ya adjuntó req.user = { id, email, role }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Usuario no autenticado (Middleware Fallido)" });
    }

    // 1. BUSCA el usuario COMPLETO con sus relaciones
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { school: true, room: true, tickets: true /* ... otras relaciones */ }
    });

    if (!user) {
      // Esto podría ocurrir si el token es válido pero el usuario fue borrado
      console.error(`Usuario con ID ${req.user.id} no encontrado.`);
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const { password, ...safeUser } = user;

    // 2. Devuelve la respuesta, incluyendo el token para actualizarlo (si es necesario)
    return res.status(200).json({
      success: true,
      user: safeUser, // 👈 Asegúrate de que este objeto se pueda serializar
      token: req.cookies.jwt_token // O generas uno nuevo si quieres refrescar la sesión
    });

  } catch (error) {
    console.error("FATAL ERROR en /auth/check-auth:", error); // 👈 ¡REVISA ESTE LOG!
    return res.status(500).json({ success: false, message: "Error interno del servidor al verificar la sesión." });
  }
};