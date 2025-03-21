import express from "express";
import { addComment, deleteComment, editCommet, getCommentByThreadId } from "../controllers/comment.controllers.js";
import { auth, hashRole } from "../middlewares/auth.js";

const commentRouter = express.Router();

// Public routes
commentRouter.get("/comment/:threadId", getCommentByThreadId);

// Private routes
commentRouter.post("/comment/:threadId/:userId/:parentId?", auth, hashRole(["USER"]), addComment);
commentRouter.patch("/comment/:commentId/:userId", auth, hashRole(["USER"]), editCommet);
commentRouter.delete("/comment/:commentId/:userId", auth, hashRole(["USER"]), deleteComment);

export default commentRouter;