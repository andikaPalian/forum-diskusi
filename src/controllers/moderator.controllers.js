import { PrismaClient } from "@prisma/client";
import validator from "validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs/promises';

const prisma = new PrismaClient();

const registerModerator = async (req, res) => {
    try {
        const {name, email, password} = req.body;
        if (!name?.trim() || !email?.trim() || !password?.trim()) {
            return res.status(400).json({
                message: "Please fill all the fields"
            });
        }

        if (typeof name !== 'string' || !validator.isLength(name, {min: 3, max: 30})) {
            return res.status(400).json({
                message: "Name must be a string beetwen 3 and 30 characters"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Please enter a valid email"
            });
        }

        const passwordReqex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordReqex.test(password)) {
            return res.status(400).json({
                messagessage: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
            });
        }

        const existingModerator = await prisma.user.findUnique({
            where: {
                email: email,
                role: "MODERATOR"
            }
        });
        if (existingModerator) {
            return res.status(400).json({
                message: "Moderator already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        
        const moderator = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "MODERATOR"
            }
        });

        res.status(201).json({
            message: "Moderator created successfully",
            moderator: {
                id: moderator.id,
                avaatar: moderator.avatar,
                name: moderator.name,
                email: moderator.email,
                role: moderator.role
            }
        });
    } catch (error) {
        console.error("Error during moderator registration:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const loginModerator = async (req, res) => {
    try {
        const {email, password} = req.body;
        if(!email?.trim() || !password?.trim()) {
            return res.status(400).json({
                message: "Please fill all the fields"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Please enter a valid email"
            });
        }

        const moderator = await prisma.user.findUnique({
            where: {
                email: email,
                role: "MODERATOR"
            }
        });
        if (!moderator) {
            return res.status(404).json({
                message: "Moderator not found please register"
            });
        }

        const isMatch = await bcrypt.compare(password, moderator.password);
        if (isMatch) {
            const token = jwt.sign({
                id: moderator.id
            }, process.env.JWT_SECRET, {expiresIn: "1d"});
            moderator.password = undefined;

            return res.status(200).json({
                message: "Moderator logged in successfully",
                moderator: {
                    id: moderator.id,
                    avatar: moderator.avatar,
                    name: moderator.name,
                    email: moderator.email,
                    role: moderator.role,
                    token: token
                }
            });
        } else {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }
    } catch (error) {
        console.error("Error during moderator login:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const uploadAvatar = async (req, res) => {
    try {
        const {userId} = req.params;

        if (userId !== req.user.userId) {
            return res.status(403).json({
                message: "You are not authorized to perform this action"
            });
        }

        if (!validator.isUUID(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        const moderator = await prisma.user.findUnique({
            where: {
                id: userId,
                role: "MODERATOR"
            }
        });
        if (!moderator) {
            return res.status(404).json({
                message: "Moderator not found"
            });
        }

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                use_filename: true,
                unique_filename:  true
            });

            await fs.unlink(req.file.path);

            await prisma.user.update({
                where: {
                    id: userId,
                    role: "MODERATOR"
                },
                data: {
                    avatar: result.secure_url,
                    cloudinaryId: result.public_id
                }
            });

            return res.status(200).json({
                message: "Avatar uploaded successfully"
            });
        } else {
            return res.status(400).json({
                message: "No file uploaded"
            });
        }
    } catch (error) {
        console.error("Error during avatar upload:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const updateProfile = async (req, res) => {
    try {
        const {userId} = req.params;
        const {name, email} = req.body;

        if (userId !== req.user.userId) {
            return res.status(403).json({
                message: "You are not authorized to perform this action"
            });
        }

        if (!validator.isUUID(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        const moderator = await prisma.user.findUnique({
            where: {
                id: userId,
                role: "MODERATOR"
            }
        });
        if (!moderator) {
            return res.status(404).json({
                message: "Moderator not found"
            });
        }

        const updateData = {};

        if (name !== undefined) {
            if (typeof name !== 'string' || !validator.isLength(name, {min: 3, max: 30})) {
                return res.status(400).json({
                    message: "Name must be a string and between 3 and 30 characters"
                })
            }

            updateData.name = name;
        }

        if (email !== undefined) {
            if (!validator.isEmail(email)) {
                return res.status(400).json({
                    message: "Please enter a valid email"
                });
            }

            updateData.email = email;
        }

        if (req.file) {
            if (moderator.cloudinaryId) {
                await cloudinary.uploader.destroy(moderator.cloudinaryId);
            }

            const result = await cloudinary.uploader.upload(req.file.path, {
                use_filename: true,
                unique_filename: true
            });

            await fs.unlink(req.file.path);

            updateData.avatar = result.secure_url;
            updateData.cloudinaryId = result.public_id;
        } else {
            updateData.avatar = moderator.avatar;
            updateData.cloudinaryId = moderator.cloudinaryId;
        }

        await prisma.user.update({
            where: {
                id: userId,
                role: "MODERATOR"
            },
            data: updateData
        });

        res.status(200).json({
            message: "Profile updated successfully"
        });
    } catch (error) {
        console.error("Error during profile update:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const getModeratorProfile = async (req, res) => {
    try {
        const {userId} = req.params;

        if (!validator.isUUID(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        const moderator = await prisma.user.findUnique({
            where: {
                id: userId,
                role: "MODERATOR"
            }
        });
        if (!moderator) {
            return res.status(404).json({
                message: "Moderator not found"
            });
        }

        res.status(200).json({
            moderator: {
                id: moderator.id,
                name: moderator.name,
                email: moderator.email,
                avatar: moderator.avatar,
                role: moderator.role
            }
        });
    } catch (error) {
        console.error("Error during fetching moderator profile:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

export {registerModerator, loginModerator, uploadAvatar, updateProfile, getModeratorProfile};