import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document<Types.ObjectId> {
  email: string;
  name: string;
  passwordHash?: string;
  provider: 'local' | 'google';
  googleId?: string;
  avatarUrl?: string;
  role: 'student' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    // Never select the hash by default; it is only pulled explicitly for login.
    passwordHash: { type: String, select: false },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, index: true, sparse: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
