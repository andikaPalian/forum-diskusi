import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();

const auth = async (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers.Authorization || req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer")) {
            token = authHeader.split(" ")[1];
            jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
                if (err) {
                    return res.status(401).json({
                        message: "Unauthorized"
                    });
                }
                const user = await prisma.user.findUnique({
                    where: {
                        id: decoded.id
                    }
                });
                if (!user) {
                    return res.status(404).json({
                        message: "User not found"
                    });
                }

                req.user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                };

                next();
            });
        } else {
            return res.status(403).json({
                message: "Token is missing or not provided"
            });
        }
    } catch (error) {
        console.error("Error during authentication:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const hashRole = (role) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({
                message: "Unauthorized access. Role information is missing."
            });
        }

        if (!Array.isArray(role)) {
            return res.status(500).json({
                message: "Internal server error: roles parameter must be an array"
            });
        }

        if (!role.includes(req.user.role)) {
            return res.status(403).json({
                message: "Forbidden access. You are not allowed to access this resource"
            });
        }

        next();
    }
}

export {auth, hashRole};