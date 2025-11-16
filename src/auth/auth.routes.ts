import { Router } from "express";
import { register, login, checkAuthStatus, logout } from "./auth.controller";
import { protectRoute } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/check-auth", protectRoute, checkAuthStatus);

export default router;