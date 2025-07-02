import express from "express";


export function createServer() {
  const app = express();
  app.use(express.json());

  return app;
}
