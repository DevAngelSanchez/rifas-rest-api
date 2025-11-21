import { Role } from "@prisma/client";

export interface UserPayload {
  id: string;
  role: Role;
  name: string;
  email?: string;
  username?: string;
}

// Hacemos el objecto user global
declare global {
  namespace Express {
    export interface Request {
      user?: UserPayload;
    }
  }
}