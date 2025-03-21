import { PrismaClient } from "@prisma/client";
import validator from "validator";

const prisma = new PrismaClient();

const addComment = async (req, res) => {
    try {
        const {threadId, userId, parentId} = req.params;
        const {content} = req.body;

        if (userId !== req.user.userId) {
            return res.status(403).json({
                message: "You are not authorized to add a comment to this thread"
            });
        }

        if (!validator.isUUID(threadId)) {
            return res.status(400).json({
                message: "Invalid thread ID"
            });
        }

        if (!validator.isUUID(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        if (typeof content !== 'string' || !validator.isLength(content, {min: 1, max: 255})) {
            return res.status(400).json({
                message: "Content must be a string with a minimum length of 1 and a maximum length of 255 characters"
            });
        }

        const thread = await prisma.thread.findUnique({
            where: {
                id: threadId
            }
        });
        if (!thread) {
            return res.status(404).json({
                message: "Thread not found"
            });
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                threadId: threadId,
                authorId: userId,
                parentId: parentId || null
            },
            include: {
                author: true
            }
        });

        res.status(201).json({
            message: "Comment added successfully",
            comment: {
                id: comment.id,
                content: comment.content,
                parentId: comment.parentId,
                author: {
                    avatar: comment.author.avatar,
                    name: comment.author.name
                }
            }
        });
    } catch (error) {
        console.error("Error during adding comment:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const getCommentByThreadId = async (req, res) => {
    try {
        const {threadId} = req.params;
        const {page = 1, limit = 10} = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        if (!validator.isUUID(threadId)) {
            return res.status(400).json({
                message: "Invalid thread ID"
            });
        }

        const comments = await prisma.comment.findMany({
            where: {
                threadId: threadId
            },
            include: {
                author: true,
                vote: true,
                replies: {
                    include: {
                        author: true
                    }
                }
            },
            skip: skip,
            take: limitNum
        });

        if (comments.length === 0) {
            return res.status(404).json({
                message: "No comments found for this thread"
            });
        }

        const totalComments = await prisma.comment.count({
            where: {
                threadId: threadId
            }
        });
        
        const formattedComments = comments.map(comment => {
            const {upVote, downVote, totalVotes} = comment.vote.reduce((acc, vote) => {
                if (vote.voteType === 1) acc.upVote += 1;
                if (vote.voteType === -1) acc.downVote += 1;
                acc.totalVotes += vote.voteType;
                return acc;
            }, {upVote: 0, downVote: 0, totalVotes: 0});

            return {
                id: comment.id,
                content: comment.content,
                author: {
                    avatar: comment.author.avatar,
                    name: comment.author.name
                },
                upVote,
                downVote,
                totalVotes,
                replies: comment.replies.map(reply => ({
                    id: reply.id,
                    content: reply.content,
                    author: {
                        avatar: reply.author.avatar,
                        name: reply.author.name
                    }
                }))
            }
        })

        res.status(200).json({
            message: "Comments retrieved successfully",
            comments: formattedComments,
            totalComments,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalComments / limitNum),
            // comments: comments.map(comment => ({
            //     id: comment.id,
            //     content: comment.content,
            //     author: {
            //         avatar: comment.author.avatar,
            //         name: comment.author.name
            //     }
            // })),
            // totalComments: totalComments,
            // totalPages: Math.ceil(totalComments / limitNum),
            // cuurentPage: pageNum,
            // limit: limitNum
        });
    } catch (error) {
        console.error("Error during getting comments by thread ID:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const editCommet = async (req, res) => {
    try {
        const {userId, commentId} = req.params;
        const {content} = req.body;

        if (userId !== req.user.userId) {
            return res.status(403).json({
                message: "You are not authorized to edit this comment"
            });
        }

        if (!validator.isUUID(commentId)) {
            return res.status(400).json({
                message: "Invalid comment ID"
            });
        }

        const comment = await prisma.comment.findUnique({
            where: {
                id: commentId,
            }
        });
        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        if (comment.authorId !== userId) {
            return res.status(403).json({
                message: "You are not authorized to edit this comment. Only the author can edit their own comment."
            });
        }

        const updateData = {};

        if (content !== undefined) {
            if (typeof content !== 'string' || !validator.isLength(content, {min: 1, max: 255})) {
                return res.status(400).json({
                    message: "Content must be a string with a minimum length of 1 and a maximum length of 255 characters"
                });
            }

            updateData.content = content;
        }

        const updatedComment = await prisma.comment.update({
            where: {
                id: commentId,
                authorId: userId
            },
            data: updateData,
            include: {
                author: true
            }
        });

        res.status(200).json({
            message: "Comment updated successfully",
            comment: {
                id: updatedComment.id,
                content: updatedComment.content,
                author: {
                    avatar: updatedComment.author.avatar,
                    name: updatedComment.author.name
                }
            }
        });
    } catch (error) {
        console.error("Error during editing comment:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const deleteComment = async (req, res) => {
    try {
        const {userId, commentId} = req.params;

        if (userId !== req.user.userId) {
            return res.status(403).json({
                message: "You are not authorized to delete this comment"
            });
        }

        if (!validator.isUUID(commentId)) {
            return res.status(400).json({
                message: "Invalid comment ID"
            });
        }

        const comment = await prisma.comment.findUnique({
            where: {
                id: commentId
            }
        });
        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        if (comment.authorId !== userId) {
            return res.status(403).json({
                message: "You are not authorized to delete this comment. Only the author can delete their own comment."
            });
        }

        await prisma.comment.delete({
            where: {
                id: commentId,
                authorId: userId
            }
        });

        res.status(200).json({
            message: "Comment deleted successfully"
        });
    } catch (error) {
        console.error("Error during deleting comment:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

export {addComment, getCommentByThreadId, editCommet, deleteComment};