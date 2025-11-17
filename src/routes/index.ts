import { Router } from "express";
import schoolRoutes from "../components/school/school.routes";
import roomRoutes from "../components/room/room.routes";
import userRoutes from "../components/user/user.routes";
import raffleRoutes from "../components/raffle/raffle.routes";
import ticketsRoutes from "../components/tickets/tickets.routes";
import invoiceRoutes from "../components/invoice/invoice.routes";

const router = Router();

router.use("/schools", schoolRoutes);
router.use("/rooms", roomRoutes);
router.use("/users", userRoutes);
router.use("/raffles", raffleRoutes);
router.use("/tickets", ticketsRoutes);
router.use("/invoices", invoiceRoutes);

export default router;