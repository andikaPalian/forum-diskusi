import express from "express";
import { getUserProfile, updateProfile, uploadAvatar, userLogin, userRegister } from "../controllers/user.controllers.js";
import { auth, hashRole } from "../middlewares/auth.js";
import upload from "../middlewares/multer.js";

const userRouter = express.Router();

// Public routes
userRouter.post("/register", userRegister);
userRouter.post("/login", userLogin);

// Private routes
userRouter.patch("/:userId/avatar", auth, hashRole(["USER"]), upload.single("avatar"), uploadAvatar);
userRouter.patch("/:userId/profile", auth, hashRole(["USER"]), upload.single("avatar") , updateProfile);
userRouter.get("/:userId", auth, hashRole(["USER"]), getUserProfile);

export default userRouter;