import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { healthRouter } from "./routes/health.js";
import { doctorsRouter } from "./modules/doctors/doctors.routes.js";
import { patientsRouter } from "./modules/patients/patients.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { billsRouter } from "./modules/bills/bills.routes.js"; // <-- Ithu irukka?
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { servicesRouter } from "./modules/services/services.routes.js";
import { medicineCategoriesRouter } from "./modules/medicine-categories/medicine-categories.routes.js";
import { villagesRouter } from "./modules/villages/villages.routes.js";
import { ageCategoriesRouter } from "./modules/age-categories/age-categories.routes.js";
import { inventoryRouter } from "./modules/inventory/inventory.routes.js";
import { racksRouter } from "./modules/racks/racks.routes.js";
import { suppliersRouter } from "./modules/suppliers/suppliers.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { settingsRouter } from  "./modules/settings/settings.routes.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRouter);
app.use("/api", healthRouter);
app.use("/api/doctors", doctorsRouter);
app.use("/api/patients", patientsRouter);
app.use("/api/products", productsRouter);
app.use("/api/bills", billsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/services", servicesRouter);
app.use("/api/medicine-categories", medicineCategoriesRouter);
app.use("/api/villages", villagesRouter);
app.use("/api/age-categories", ageCategoriesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/racks", racksRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/users", usersRouter);
app.use("/api/settings", settingsRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Raja Nursing Home API listening on http://localhost:${env.port}`);
  console.log(`Health:    GET http://localhost:${env.port}/api/health`);
  console.log(`Login:     POST http://localhost:${env.port}/api/auth/login`);
});
