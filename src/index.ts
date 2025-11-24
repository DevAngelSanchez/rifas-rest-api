import 'dotenv/config';
import express from 'express';
import authRoutes from './auth/auth.routes';
import apiRoutes from './routes';
import cookieParser from "cookie-parser";
import cors from "cors";
import path from 'path';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_STATIC_PATH = path.join(__dirname, '..', 'public', 'uploads');

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173" || "https://rifas-46tm8vmwx-devangelsanchezs-projects.vercel.app/", // Asegúrate de que esta URL sea la de tu frontend
  methods: "GET, HEAD, POST, PUT, PATCH, DELETE",
  credentials: true
}));

console.log('Ruta estática configurada para:', UPLOADS_STATIC_PATH);

app.use('/uploads', express.static(UPLOADS_STATIC_PATH));

// Usar las rutas de autenticación
app.use('/auth', authRoutes);
app.use("/api", apiRoutes);

app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer error:", err);
    return res.status(400).json({ title: "Error de subida", msg: err.message });
  }
  next(err);
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});