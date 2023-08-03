import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

const URL = (process.env.URL as string) || 'http://127.0.0.1';
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3010;

app.listen(PORT, () => {
  console.log(`Go here to login: ${URL}:${PORT}/login`);
});
