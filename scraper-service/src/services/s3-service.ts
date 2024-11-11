import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
    this.bucket = process.env.AWS_S3_BUCKET || '';
  }

  async uploadFighterImage(imageUrl: string): Promise<string> {
    try {
      // Download image
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      // Process image with sharp
      const processedImage = await sharp(buffer)
        .resize(350, 254, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Generate unique filename
      const filename = `fighters/${uuidv4()}.jpg`;

      // Upload to S3
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: processedImage,
        ContentType: 'image/jpeg'
      }));

      // Return the S3 URL
      return `https://${this.bucket}.s3.amazonaws.com/${filename}`;
    } catch (error) {
      console.error('Error uploading fighter image:', error);
      throw error;
    }
  }
} 