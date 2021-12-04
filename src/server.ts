import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client } from "pg";
import {
  addDummyDbItems,
  addDbItem,
  getAllDbItems,
  getDbItemById,
  DbItem,
  updateDbItemById,
  deleteDbItemById,
} from "./db";
import filePath from "./filePath";

// loading in some dummy items into the database
// (comment out if desired, or change the number)
addDummyDbItems(20);

// read in contents of any environment variables in the .env file
dotenv.config();

// use the environment variable PORT, or 4000 as a fallback
const PORT_NUMBER = process.env.PORT ?? 4000;
const connectionString = process.env.DATABASE_URL ?? null;

const client = connectionString
  ? new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    }) // use connection string to heroku
  : new Client({ database: "notes" }); // use default to local

async function connectClient() {
  await client.connect();
}
connectClient();

const app = express();

/** Parses JSON data in a request automatically */
app.use(express.json());
/** To allow 'Cross-Origin Resource Sharing': https://en.wikipedia.org/wiki/Cross-origin_resource_sharing */
app.use(cors());

// get notes
app.get("/notes", async (req, res) => {
  const result = await client.query("SELECT * FROM notes");
  const notes = result.rows;
  res.status(200).json({
    status: "success",
    data: {
      notes,
    },
  });
});

// POST /items
app.post<{}, {}, DbItem>("/notes", async (req, res) => {
  // to be rigorous, ought to handle non-conforming request bodies
  // ... but omitting this as a simplification
  const { note, completed } = req.body;
  const result = await client.query(
    "INSERT INTO notes VALUES (DEFAULT, $1, 'General', NOW(), NOW(), $2) RETURNING *",
    [note, completed]
  );
  const notes = result.rows;
  if (result.rowCount === 1) {
    res.status(201).json({
      status: "success",
      data: {
        notes,
      },
    });
  } else {
    res.status(404).json(result);
  }
});

// GET /items/:id
app.get<{ id: string }>("/notes/:id", async (req, res) => {
  const result = await client.query("SELECT * FROM notes WHERE id=$1", [
    req.params.id,
  ]);
  const notes = result.rows;
  if (result.rowCount === 1) {
    res.status(200).json({
      status: "success",
      data: {
        notes,
      },
    });
  } else {
    res.status(404).json(result);
  }
});

// DELETE /items/:id
app.delete<{ id: string }>("/notes/:id", async (req, res) => {
  const result = await client.query(
    "DELETE FROM notes WHERE id=$1 RETURNING *",
    [req.params.id]
  );
  if (result.rowCount === 1) {
    res.status(200).json(result);
  } else {
    res.status(404).json(result);
  }
});

// PATCH /items/:id
app.patch<{ id: string }, {}, Partial<DbItem>>(
  "/notes/:id",
  async (req, res) => {
    const { note, completed } = req.body;
    const result = await client.query(
      "UPDATE notes SET note=$1, completed = $2 WHERE id = $3 RETURNING *",
      [note, completed, req.params.id]
    );
    if (result.rowCount === 1) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json(result);
    }
  }
);

app.listen(PORT_NUMBER, () => {
  console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
