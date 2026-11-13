/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import dbConnect from "./db";
import InterviewSession, { IInterviewSession } from "./models/InterviewSession";
import Answer, { IAnswer } from "./models/Answer";
import FeedbackReport, { IFeedbackReport } from "./models/FeedbackReport";

interface GlobalMemoryStore {
  sessions: Map<string, any>;
  answers: any[];
  reports: Map<string, any>;
}

declare global {
  // eslint-disable-next-line no-var
  var memoryStoreCache: GlobalMemoryStore | undefined;
}

const memoryStore: GlobalMemoryStore = global.memoryStoreCache ?? {
  sessions: new Map<string, any>(),
  answers: [],
  reports: new Map<string, any>(),
};

if (!global.memoryStoreCache) {
  global.memoryStoreCache = memoryStore;
}

const memorySessions = memoryStore.sessions;
const memoryAnswers = memoryStore.answers;
const memoryReports = memoryStore.reports;

let isMongoAvailable: boolean | null = null;

async function checkMongoConnection(): Promise<boolean> {
  if (isMongoAvailable !== null) return isMongoAvailable;
  try {
    await dbConnect();
    isMongoAvailable = true;
    console.log("✅ [DB] Connected to MongoDB database successfully.");
    return true;
  } catch (err) {
    // In production the in-memory store isn't shared between server instances, so
    // using it would lose data. Fail the request instead; Mongo is retried next time.
    if (process.env.NODE_ENV === "production") {
      console.error("❌ [DB] Could not connect to MongoDB. Check MONGODB_URI.", err);
      throw new Error("The database is unavailable right now. Please try again in a minute.");
    }
    isMongoAvailable = false;
    console.warn(
      "⚠️ [DB] MongoDB not running locally. Using fast in-memory session store."
    );
    return false;
  }
}

export async function createInterviewSession(data: {
  sessionId: string;
  userId: string;
  jobDescription: string;
  resumeText: string;
  questions: string[];
  questionDetails?: any[];
  track?: string;
}): Promise<any> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    return await InterviewSession.create({
      track: "mock-interview",
      ...data,
      status: "in_progress",
      currentQuestionIndex: 0,
      awaitingFollowUp: false,
    });
  } else {
    const session = {
      track: "mock-interview",
      ...data,
      status: "in_progress",
      currentQuestionIndex: 0,
      awaitingFollowUp: false,
      createdAt: new Date(),
    };
    memorySessions.set(data.sessionId, session);
    return session;
  }
}

export async function getInterviewSession(sessionId: string): Promise<any> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    return await InterviewSession.findOne({ sessionId });
  } else {
    return memorySessions.get(sessionId) || null;
  }
}

export async function updateInterviewSession(
  sessionId: string,
  updates: Partial<IInterviewSession>
): Promise<any> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    return await InterviewSession.findOneAndUpdate({ sessionId }, updates, {
      new: true,
    });
  } else {
    const session = memorySessions.get(sessionId);
    if (!session) return null;
    Object.assign(session, updates);
    memorySessions.set(sessionId, session);
    return session;
  }
}

export async function createAnswerRecord(data: {
  sessionId: string;
  questionIndex: number;
  questionText: string;
  answerTranscript: string;
  audioDuration: number;
  followUpText?: string | null;
  followUpTranscript?: string | null;
  followUpAudioDuration?: number | null;
  eyeContactPercent?: number | null;
  movementScore?: "low" | "moderate" | "high" | null;
  bodyLanguage?: Record<string, unknown> | null;
}): Promise<any> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    return await Answer.create(data);
  } else {
    const answer = {
      ...data,
      followUpText: data.followUpText || null,
      followUpTranscript: data.followUpTranscript || null,
      followUpAudioDuration: data.followUpAudioDuration || null,
      eyeContactPercent: data.eyeContactPercent ?? null,
      movementScore: data.movementScore ?? null,
      bodyLanguage: data.bodyLanguage ?? null,
      followUpBodyLanguage: null,
      createdAt: new Date(),
    };
    memoryAnswers.push(answer);
    return answer;
  }
}

export async function findAnswerRecord(
  sessionId: string,
  questionIndex: number
): Promise<any> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    return await Answer.findOne({ sessionId, questionIndex });
  } else {
    return (
      memoryAnswers.find(
        (a) => a.sessionId === sessionId && a.questionIndex === questionIndex
      ) || null
    );
  }
}

export async function updateAnswerRecord(
  sessionId: string,
  questionIndex: number,
  updates: Partial<IAnswer>
): Promise<any> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    const answer = await Answer.findOne({ sessionId, questionIndex });
    if (answer) {
      Object.assign(answer, updates);
      await answer.save();
    }
    return answer;
  } else {
    const answer = memoryAnswers.find(
      (a) => a.sessionId === sessionId && a.questionIndex === questionIndex
    );
    if (answer) {
      Object.assign(answer, updates);
    }
    return answer;
  }
}

export async function getAnswersForSession(sessionId: string): Promise<any[]> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    return await Answer.find({ sessionId }).sort({ questionIndex: 1 });
  } else {
    return memoryAnswers
      .filter((a) => a.sessionId === sessionId)
      .sort((a, b) => a.questionIndex - b.questionIndex);
  }
}

export async function saveFeedbackReport(
  sessionId: string,
  reportData: any
): Promise<any> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    return await FeedbackReport.findOneAndUpdate({ sessionId }, reportData, {
      upsert: true,
      new: true,
    });
  } else {
    const report = {
      sessionId,
      ...reportData,
      createdAt: new Date(),
    };
    memoryReports.set(sessionId, report);
    return report;
  }
}

export async function getFeedbackReport(sessionId: string): Promise<any> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    return await FeedbackReport.findOne({ sessionId });
  } else {
    return memoryReports.get(sessionId) || null;
  }
}

/** The user's sessions, newest first, with just what a history list needs. */
export async function listSessionsForUser(userId: string): Promise<any[]> {
  const useMongo = await checkMongoConnection();
  const fields = (s: any) => ({
    sessionId: s.sessionId,
    track: s.track,
    status: s.status,
    questionCount: s.questions?.length ?? 0,
    createdAt: s.createdAt,
  });
  if (useMongo) {
    const sessions = await InterviewSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("sessionId track status questions createdAt")
      .lean();
    return sessions.map(fields);
  }
  return Array.from(memorySessions.values())
    .filter((s) => s.userId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .map(fields);
}

/** Permanently removes every session, answer and report that belongs to the user. */
export async function deleteUserData(userId: string): Promise<number> {
  const useMongo = await checkMongoConnection();
  if (useMongo) {
    const ids = (await InterviewSession.find({ userId }).select("sessionId").lean()).map((s: any) => s.sessionId);
    await Promise.all([
      Answer.deleteMany({ sessionId: { $in: ids } }),
      FeedbackReport.deleteMany({ sessionId: { $in: ids } }),
      InterviewSession.deleteMany({ userId }),
    ]);
    return ids.length;
  }
  const ids = Array.from(memorySessions.values())
    .filter((s) => s.userId === userId)
    .map((s) => s.sessionId);
  for (const id of ids) {
    memorySessions.delete(id);
    memoryReports.delete(id);
  }
  for (let i = memoryAnswers.length - 1; i >= 0; i--) {
    if (ids.includes(memoryAnswers[i].sessionId)) memoryAnswers.splice(i, 1);
  }
  return ids.length;
}
