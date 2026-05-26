import "dotenv/config";
import { Pool } from 'pg'; // <-- Importamos Pool de la librería nativa
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;

// Creamos el pool de conexiones configurando SSL para Aiven
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // <-- Esto evita el error del certificado TLS en Render
  }
});

// Le pasamos el pool al adaptador en lugar del string directo
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };

export const saltRounds = 10;