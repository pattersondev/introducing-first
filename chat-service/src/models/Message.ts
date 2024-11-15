import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  matchup_id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at?: Date;
  deleted?: boolean;
  user_name: string;    // Store username for display
  user_avatar?: string; // Optional user avatar URL
}

const MessageSchema = new Schema({
  matchup_id: {
    type: String,
    required: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date
  },
  deleted: {
    type: Boolean,
    default: false
  },
  user_name: {
    type: String,
    required: true
  },
  user_avatar: String
});

// Compound index for efficient matchup queries
MessageSchema.index({ matchup_id: 1, created_at: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema); 