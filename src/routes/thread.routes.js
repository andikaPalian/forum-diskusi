import express from "express";
import { auth, hashRole } from "../middlewares/auth.js";
import { createThread, deleteThread, getThread, getThreadById, getThreadByUserId, updateThread } from "../controllers/thread.controllers.js";
import upload from "../middlewares/multer.js";

const threadRouter = express.Router();

// Public routes
threadRouter.get("/thread", getThread);
threadRouter.get("/thread/:threadId", getThreadById);
threadRouter.get("/thread/user/:userId", getThreadByUserId);

// Private routes
threadRouter.post("/thread/:userId", auth, hashRole(["USER"]), upload.single("content") , createThread);
threadRouter.patch("/thread/:threadId/:userId", auth, hashRole(["USER"]), upload.single("content") , updateThread);
threadRouter.delete("/thread/:threadId/:userId", auth, hashRole(["USER"]), deleteThread);

export default threadRouter;