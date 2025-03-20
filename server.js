import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectCloudinary from './src/config/cloudinary.js';
import multer from 'multer';
import userRouter from './src/routes/user.routes.js';
import threadRouter from './src/routes/thread.routes.js';
import commentRouter from './src/routes/comment.routes.js';
import moderatorRouter from './src/routes/moderator.routes.js';
import voteRouter from './src/routes/vote.routes.js';

const app = express();
const port = process.env.PORT;
connectCloudinary();

app.use(cors());
app.use(express.json());

app.use("/api/user", userRouter);
app.use("/api/thread", threadRouter);
app.use("/api/comment", commentRouter);
app.use("/api/moderator", moderatorRouter);
app.use("/api/vote", voteRouter);

// Handle multer errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
    } else if (err) {
        console.error("Unexpected error:", err)
        return res.status(500).json({ message: err.message || "Internal server error" });
    }
    next();
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});