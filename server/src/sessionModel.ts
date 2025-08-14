import mongoose, { Schema, Document } from "mongoose";
import db from "./db";

// Define the Session interface
export interface ISession extends Document {
  sessionId: string;
  data: any;
  expires: Date;
}

// Define the Session schema
const SessionSchema: Schema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  data: { type: Schema.Types.Mixed, required: true },
  expires: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

// Create the Session model
const Session = db.model<ISession>("Session", SessionSchema);

export { Session, SessionSchema };
