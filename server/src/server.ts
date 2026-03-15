import dotenv from "dotenv";
import { AppDataSource } from "./app-data-source";
import { app } from "./app";

dotenv.config();

const PORT = Number(process.env.PORT || 5000);

AppDataSource.initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database initialization failed", error);
    process.exit(1);
  });
