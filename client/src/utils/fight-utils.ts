import { Swords, Handshake, Ban, GripHorizontal, Dumbbell, Lock } from "lucide-react";

export type ResultMethod = 'KO/TKO' | 'Submission' | 'Decision' | 'No Contest' | 'Draw' | null;

export function parseResult(result: string): {
  method: ResultMethod;
  details: string;
  round?: string;
  time?: string;
} {
  if (!result) return { method: null, details: '' };

  // Common pattern in results: "FinalKO/TKOR2, 2:32" or "FinalU DecR3, 5:00"
  const resultLower = result.toLowerCase();

  if (resultLower.includes('ko') || resultLower.includes('tko')) {
    return {
      method: 'KO/TKO',
      details: 'KO/TKO',
      round: result.match(/R(\d+)/)?.[1],
      time: result.split(', ')[1]
    };
  }

  if (resultLower.includes('sub')) {
    return {
      method: 'Submission',
      details: 'Submission',
      round: result.match(/R(\d+)/)?.[1],
      time: result.split(', ')[1]
    };
  }

  if (resultLower.includes('dec')) {
    const isUnanimous = resultLower.includes('u dec');
    const isSplit = resultLower.includes('s dec');
    return {
      method: 'Decision',
      details: `${isUnanimous ? 'Unanimous' : isSplit ? 'Split' : ''} Decision`,
      round: result.match(/R(\d+)/)?.[1],
      time: result.split(', ')[1]
    };
  }

  if (resultLower.includes('nc')) {
    return {
      method: 'No Contest',
      details: 'No Contest'
    };
  }

  if (resultLower.includes('draw')) {
    return {
      method: 'Draw',
      details: 'Draw'
    };
  }

  return { method: null, details: result };
}

export function getResultIcon(method: ResultMethod) {
  switch (method) {
    case 'KO/TKO':
      return Swords;
    case 'Submission':
      return Lock;
    case 'Decision':
      return Handshake;
    case 'No Contest':
    case 'Draw':
      return Ban;
    default:
      return null;
  }
}

export function getResultColor(method: ResultMethod): string {
  switch (method) {
    case 'KO/TKO':
      return 'text-red-400';
    case 'Submission':
      return 'text-blue-400';
    case 'Decision':
      return 'text-yellow-400';
    case 'No Contest':
    case 'Draw':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
} 