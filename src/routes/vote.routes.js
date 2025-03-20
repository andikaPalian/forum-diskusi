import express from "express";
import { auth, hashRole } from "../middlewares/auth.js";
import { getTotalVoteComments, getTotalVoteThreads, voteComment, voteThread } from "../controllers/vote.controllers.js";

const voteRouter = express.Router();

// Public routes
voteRouter.get("/thread/:threadId/vote", getTotalVoteThreads);
voteRouter.get("/comment/:commentId/vote", getTotalVoteComments);

// Private routes
voteRouter.post("/thread/:threadId/:userId/vote", auth, hashRole(["USER"]), voteThread);
voteRouter.post("/comment/:commentId/:userId/vote", auth, hashRole(["USER"]), voteComment);

export default voteRouter;