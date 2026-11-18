import type { SubjectId } from '../core/types';

export interface Subject { id: SubjectId; title: string; icon: string; color: string }

export const SUBJECTS: Subject[] = [
  { id: 'math', title: 'Maths', icon: '🔢', color: '#F59E0B' },
  { id: 'english', title: 'English', icon: '🔤', color: '#FF6B6B' },
  { id: 'science', title: 'Science', icon: '🔬', color: '#10B981' },
  { id: 'gp', title: 'Global Perspectives', icon: '🌏', color: '#3B82F6' },
  { id: 'wellbeing', title: 'Wellbeing', icon: '💛', color: '#EC4899' },
  { id: 'art', title: 'Art & Design', icon: '🎨', color: '#8B5CF6' },
  { id: 'music', title: 'Music', icon: '🎵', color: '#F97316' },
  { id: 'computing', title: 'Computing', icon: '🤖', color: '#14B8A6' },
];
