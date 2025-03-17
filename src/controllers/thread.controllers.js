import { PrismaClient } from "@prisma/client";
import validator from "validator";
import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs/promises';

const prisma = new PrismaClient();

const createThread = async (req, res) => {
    try {
        const {userId} = req.params;
        const {title} = req.body;
        let {content} = req.body;

        if (!validator.isUUID(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        if (typeof title !== 'string' || !validator.isLength(title, {min: 3, max: 100})) {
            return res.status(400).json({
                message: "Title must be a string and between 3 and 100 characters"
            });
        }

        let cloudinaryId = "";

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                use_filename: true,
                unique_filename: true
            });

            await fs.unlink(req.file.path);

            content = result.secure_url;
            cloudinaryId = result.public_id;
        } else if (typeof content !== 'string' || !validator.isLength(content, {min: 3, max: 1000})) {
            return res.status(400).json({
                message: "Content must be a string and between 3 and 1000 characters"
            });
        }

        const thread = await prisma.thread.create({
            data: {
                title,
                content,
                authorId: userId,
                cloudinaryId: cloudinaryId
            }, include: {
                author: true
            }
        });

        res.status(201).json({
            message: "Thread created successfully",
            thread: {
                id: thread.id,
                title: thread.title,
                content: thread.content,
                author: {
                    id: thread.author.id,
                    avatar: thread.author.avatar,
                    name: thread.author.name
                }
            }
        });
    } catch (error) {
        console.error("Error during create thread:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const getThread = async (req, res) => {
    try {
        const {page = 1, limit = 10} = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const threads = await prisma.thread.findMany({
            include: {
                author: true
            },
            skip: skip,
            take: limitNum
        });

        res.status(200).json({
            message: "Threads fetched successfully",
            threads: threads.map(thread => ({
                id: thread.id,
                title: thread.title,
                content: thread.content,
                author: {
                    avatar: thread.author.avatar,
                    name: thread.author.name
                }
            })),
            page: pageNum,
            limit: limitNum,
            totalPage: Math.ceil(threads.length / limitNum)
        });
    } catch (error) {
        console.error("Error during get threads:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const getThreadById = async (req, res) => {
    try {
        const {threadId} = req.params;

        const thread = await prisma.thread.findUnique({
            where: {
                id: threadId
            },
            include: {
                author: true
            }
        });
        if (!thread) {
            return res.status(404).json({
                message: "Thread not found"
            });
        }

        res.status(200).json({
            message: "Thread fetched successfully",
            thread: {
                id: thread.id,
                title: thread.title,
                content: thread.content,
                author: {
                    avatar: thread.author.avatar,
                    name: thread.author.name
                }
            }
        });
    } catch (error) {
        console.error("Error during get thread by Id:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const getThreadByUserId = async (req, res) => {
    try {
        const {userId} = req.params;
        const {page = 1, limit = 10} = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const threads = await prisma.thread.findMany({
            where: {
                authorId: userId
            },
            include: {
                author: true
            },
            sklip: skip,
            take: limitNum
        });
        if (!threads) {
            return res.status(404).json({
                message: "Threads not found"
            });
        }

        res.status(200).json({
            message: "Threads fetched successfully",
            threads: threads.map(thread => ({
                id: thread.id,
                title: thread.title,
                content: thread.content,
                author: {
                    avatar: thread.author.avatar,
                    name: thread.author.name
                }
            })),
            page: pageNum,
            limit: limitNum,
            totalPage: Math.ceil(threads.length / limitNum)
        });
    } catch (error) {
        console.error("Error during get thread by user Id:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

export {createThread, getThread, getThreadById, getThreadByUserId};