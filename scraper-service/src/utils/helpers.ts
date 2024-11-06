import crypto from 'crypto';

export function generateId(...data: (string | object)[]): string {
  console.log('Generating ID for:', data);
  const hash = crypto.createHash('md5');
  data.forEach(d => {
    if (typeof d === 'object') {
      hash.update(JSON.stringify(d));
    } else {
      hash.update(d);
    }
  });
  return hash.digest('hex');
} 