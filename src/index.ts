import 'dotenv/config';
import express from 'express';
import authRoutes from './auth/auth.routes';
import apiRoutes from './routes';
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173", // Asegúrate de que esta URL sea la de tu frontend
  methods: "GET, HEAD, POST, PUT, PATCH, DELETE",
  credentials: true
}));

// Usar las rutas de autenticación
app.use('/auth', authRoutes);
app.use("/api", apiRoutes);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});