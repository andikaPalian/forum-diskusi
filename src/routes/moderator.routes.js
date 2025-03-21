import express from 'express';
import { getModeratorProfile, loginModerator, registerModerator, updateProfile, uploadAvatar } from '../controllers/moderator.controllers.js';
import { auth, hashRole } from '../middlewares/auth.js';
import upload from '../middlewares/multer.js';

const moderatorRouter = express.Router();

// Public routes
moderatorRouter.post("/login", loginModerator);

// Private routes
moderatorRouter.post("/register", auth, hashRole(["MODERATOR"]), registerModerator);
moderatorRouter.patch("/avatar/:userId", auth, hashRole(["MODERATOR"]), upload.single("avatar"), uploadAvatar);
moderatorRouter.patch("/profile/:userId", auth, hashRole(["MODERATOR"]), updateProfile);
moderatorRouter.get("/profile/:userId", auth, hashRole(["MODERATOR"]), getModeratorProfile);

export default moderatorRouter;