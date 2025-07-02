import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
    res.send("OK");
});

app.post("/test", async (req, res) => {
    const { name } = req.body;
    const test = await prisma.test.create({
        data: {
            name
        }
    });
    res.json(test);
});

app.get("/test", async (req, res) => {
    const test = await prisma.test.findMany();
    res.json(test);
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});