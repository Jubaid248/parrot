/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInterviewSession extends Document {
  sessionId: string;
  userId: string;
  jobDescription: string;
  resumeText: string;
  questions: string[];
  questionDetails?: any[];
  track: string;
  status: "in_progress" | "completed";
  currentQuestionIndex: number;
  awaitingFollowUp: boolean;
  createdAt: Date;
}

const InterviewSessionSchema = new Schema<IInterviewSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    // Clerk user id of the owner; only they can read the session and its report
    userId: { type: String, required: true, index: true },
    jobDescription: { type: String, required: true },
    resumeText: { type: String, required: true },
    questions: { type: [String], required: true },
    questionDetails: { type: Schema.Types.Mixed, default: [] },
    track: { type: String, default: "mock-interview" },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },
    currentQuestionIndex: { type: Number, default: 0 },
    awaitingFollowUp: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Practice data is deleted automatically after 90 days
InterviewSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const InterviewSession: Model<IInterviewSession> =
  mongoose.models.InterviewSession ||
  mongoose.model<IInterviewSession>("InterviewSession", InterviewSessionSchema);

export default InterviewSession;
