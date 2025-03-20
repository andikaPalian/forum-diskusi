import { PrismaClient } from "@prisma/client";
import validator from "validator";

const prisma = new PrismaClient();

const voteThread = async (req, res) => {
    try {
        const {userId, threadId} = req.params;
        const {vote} = req.body;

        if (userId !== req.user.userId) {
            return res.status(403).json({
                message: "You are not authorized to vote on this thread"
            });
        }

        if (!validator.isUUID(threadId)) {
            return res.status(400).json({
                message: "Invalid thread ID"
            });
        }

        const voteFormat = [1, -1];
        if (!voteFormat.includes(vote)) {
            return res.status(400).json({
                message: "Invalid vote value, vote must be 1 for upvote or -1 for downvote"
            });
        }

        const existingVote = await prisma.threadVote.findUnique({
            where: {
                userId_threadId: {
                    userId,
                    threadId
                }
            }
        });
        if (existingVote) {
            if (existingVote.voteType === vote) {
                // Jika user vote 2 kali dengan pilihan yang sama, maka vote dihapus
                await prisma.threadVote.delete({
                    where: {
                        userId_threadId: {
                            userId,
                            threadId
                        }
                    }
                });
                return res.status(200).json({
                    message: "Vote removed successfully"
                });
            } else {
                // Jika user mengubah vote (upvote menjadi downvote atau sebaliknya), maka vote diupdate
                await prisma.threadVote.update({
                    where: {
                        userId_threadId: {
                            userId,
                            threadId
                        }
                    },
                    data: {
                        voteType: vote
                    }
                });

                return res.status(200).json({
                    message: "Vote uppdated successfully"
                });
            }
        }

        // Jika user belum pernah vote, tambahkan vote baru
        await prisma.threadVote.create({
            data: {
                userId,
                threadId,
                voteType: vote
            }
        });

        res.status(201).json({
            message: "Vote added successfully"
        });
    } catch (error) {
        console.error("Error during vote:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const voteComment = async (req, res) => {
    try {
        const {userId, commentId} = req.params;
        const {vote} = req.body;

        if (userId !== req.user.userId) {
            return res.status(403).json({
                message: "You are not authorized to vote on this comment"
            });
        }

        if (!validator.isUUID(commentId)) {
            return res.status(400).json({
                message: "Invalid comment ID"
            });
        }

        const voteFormat = [1, -1];
        if (!voteFormat.includes(vote)) {
            return res.status(400).json({
                message: "Invalid vote value, vote must be 1 for upvote or -1 for downvote"
            });
        }

        const existingVote = await prisma.commentVote.findUnique({
            where: {
                userId_commentId: {
                    userId,
                    commentId
                }
            }
        });
        if (existingVote) {
            if (existingVote.voteType === vote) {
                // Jika user vote 2 kali dengan pilihan yang sama, maka vote dihapus
                await prisma.commentVote.delete({
                    where: {
                        id: existingVote.id,
                        userId_commentId: {
                            userId,
                            commentId
                        }
                    }
                });

                return res.status(400).json({
                    message: "Vote removed successfully"
                });
            } else {
                // Jika user mengubah vote (opvote menjadi downvote atau sebaliknya), maka vote diupdate
                await prisma.commentVote.update({
                    where: {
                        id: existingVote.id,
                        userId_commentId: {
                            userId,
                            commentId
                        }
                    },
                    data: {
                        voteType: vote
                    }
                });

                return res.status(200).json({
                    message: "Vote uppdated successfully"
                });
            }
        }

        // Jika user belum pernah vote, tambahkan vote baru
        await prisma.commentVote.create({
            data: {
                userId,
                commentId,
                voteType: vote
            }
        });

        res.status(201).json({
            message: "Vote added successfully"
        });
    } catch (error) {
        console.error("Error during vote:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const getTotalVoteThreads = async (req, res) => {
    try {
        const {threadId} = req.params;

        if (!validator.isUUID(threadId)) {
            return res.status(400).json({
                message: "Invalid thread ID"
            });
        }

        const upvotes = await prisma.threadVote.count({
            where: {
                threadId,
                voteType: 1
            }
        });

        const dowbVotes = await prisma.threadVote.count({
            where: {
                threadId,
                voteType: -1
            }
        });

        const totalVotes = upvotes - dowbVotes;

        res.status(200).json({
            message: "Total votes retrieved successfully",
            vote: {
                upvotes: upvotes,
                dowbVotes: dowbVotes,
                totalVotes: totalVotes
            }
        });
    } catch (error) {
        console.error("Error during get total votes:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

const getTotalVoteComments = async (req, res) => {
    try {
        const {commentId} = req.params;

        if (!validator.isUUID(commentId)) {
            return res.status(400).json({
                message: "Invalid comment ID"
            });
        }

        const upvotes = await prisma.commentVote.count({
            where: {
                commentId,
                voteType: 1
            }
        });

        const downVotes = await prisma.commentVote.count({
            where: {
                commentId,
                voteType: -1
            }
        });

        const totalVotes = upvotes - downVotes;

        res.status(200).json({
            message: "Total votes retrieved successfully",
            vote: {
                upvotes: upvotes,
                downVotes: downVotes,
                totalVotes: totalVotes
            }
        });
    } catch (error) {
        console.error("Error during get total votes:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
}

export {voteThread, voteComment, getTotalVoteThreads, getTotalVoteComments};