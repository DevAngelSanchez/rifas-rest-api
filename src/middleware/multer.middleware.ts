import * as fs from "fs";
import multer from 'multer';
import path from 'path';

// --- Definir Rutas de Subida ---
const uploadDir = path.join(__dirname, "..", "..", "public", 'uploads', 'proofs');
// Asumiendo que 'uploads' está en la raíz de tu proyecto (junto a rifas-api)

// Asegurarse de que el directorio exista
if (!fs.existsSync(uploadDir)) {
  console.log(`Creando directorio: ${uploadDir}`);
  // recursive: true permite crear directorios anidados (ej: uploads y proofs)
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Directorio creado exitosamente.');
}

// Configuración de almacenamiento local
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // La carpeta donde se guardarán los comprobantes (debe existir)
    // Puedes usar 'uploads/invoices' o similar
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Genera un nombre único para el archivo (ej: invoice-123456789-timestamp.jpg)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'proof-' + uniqueSuffix + extension);
  }
});

// Filtro de archivos para aceptar solo imágenes comunes y PDFs
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    // Rechazar archivo
    cb(null, false);
  }
};

// Configuración de Multer: Limite de 5MB
export const uploadProof = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter,
});