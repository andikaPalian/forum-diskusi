import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import fs from "fs/promises";
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

const userRegister = async (req, res) => {
    try {
        const {name, email, password} = req.body;
        if (!name?.trim() || !email?.trim() || !password?.trim()) {
            return res.status(400).json({
                message: "Please fill all the fields"
            });
        }

        if (typeof name !== "string" || !validator.isLength(name, {min: 3, max: 30})) {
            return res.status(400).json({
                message: "Name must be a string and between 3 and 30 characters"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email"
            });
        }

        const passwordReqex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordReqex.test(password)) {
            return res.status(400).json({
                messagessage: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
            });
        }

        const userExisting = await prisma.user.findUnique({
            where: {
                email_role: {
                    email: email,
                    role: "USER"
                }
            }
        });
        if (userExisting) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name: name,
                email: email,
                password: hashedPassword,
                role: "USER"
            }
        });

        res.status(201).json({
            message: "User created successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Error during user registration:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const userLogin = async (req, res) => {
    try {
        const {email, password} = req.body;
        if (!email?.trim() || !password?.trim()) {
            return res.status(400).json({
                message: "Please fill all the fields"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email"
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                email_role: {
                    email: email,
                    role: "USER"
                }
            }
        });
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (user.isBanned === true) {
            return res.status(403).json({
                message: "Your account has been banned, please contact the administrator or moderator"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            const token = jwt.sign({
                id: user.id
            }, process.env.JWT_SECRET, {
                expiresIn: "1d"
            });
            user.password = undefined;
            return res.status(200).json({
                message: "User logged in successfully",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    token: token
                }
            });
        } else {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }
    } catch (error) {
        console.error("Error during user login:", error);
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

        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                use_filename: true,
                unique_filename: true
            });

            await fs.unlink(req.file.path);

            await prisma.user.update({
                where: {
                    id: userId,
                    role: "USER"
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

        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const updateData = {};

        if (name !== undefined) {
            if (typeof name !== 'string' || !validator.isLength(name, {min: 3, max: 30})) {
                return res.status(400).json({
                    message: "Name must be a string with a length between 3 and 30 characters"
                });
            }

            updateData.name = name;
        }

        if (email !== undefined) {
            if (!validator.isEmail(email)) {
                return res.status(400).json({
                    message: "Invalid email"
                });
            }

            if (user.email === email) {
                return res.status(400).json({
                    message: "New email must be different from the current email"
                });
            }

            updateData.email = email;
        }

        if (req.file) {
            // Jika ingin membuat fitur jika avatar diubah, maka hapus avatar lama di cloudinary
            if (user.cloudinaryId) {
                await cloudinary.uploader.destroy(user.cloudinaryId);
            }

            const result = await cloudinary.uploader.upload(req.file.path, {
                use_filename: true,
                unique_filename: true
            });

            await fs.unlink(req.file.path);

            updateData.avatar = result.secure_url;
            updateData.cloudinaryId = result.public_id;
        } else {
            // await fs.unlink(req.file.path);

            updateData.avatar = user.avatar;
            updateData.cloudinaryId = user.cloudinaryId;
        }

        await prisma.user.update({
            where: {
                id: userId,
                role: "USER"
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

const getUserProfile = async (req, res) => {
    try {
        const {userId} = req.params;

        if (!validator.isUUID(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const userProfile = {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
        };

        res.status(200).json(
            userProfile
        );
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

export {userRegister, userLogin, uploadAvatar, updateProfile, getUserProfile};