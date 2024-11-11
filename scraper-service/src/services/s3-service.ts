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

  private async checkImageExists(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async uploadFighterImage(imageUrl: string): Promise<string | null> {
    try {
      // Check if image exists before attempting download
      const imageExists = await this.checkImageExists(imageUrl);
      if (!imageExists) {
        console.log(`Image not found at URL: ${imageUrl}`);
        return null;
      }

      // Download image
      const response = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        validateStatus: function (status) {
          return status === 200; // Only accept 200 status code
        }
      });

      // Validate that we received an image
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) {
        console.log(`Invalid content type received: ${contentType}`);
        return null;
      }

      const buffer = Buffer.from(response.data);

      // Validate buffer is not empty
      if (!buffer || buffer.length === 0) {
        console.log('Received empty buffer from image URL');
        return null;
      }

      try {
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
          ContentType: 'image/jpeg',
          ACL: 'public-read' // Make sure the image is publicly accessible
        }));

        // Return the S3 URL
        return `https://${this.bucket}.s3.amazonaws.com/${filename}`;
      } catch (sharpError) {
        console.error('Error processing image with Sharp:', sharpError);
        return null;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error uploading fighter image:', {
          status: error.response?.status,
          url: imageUrl,
          message: error.message
        });
      } else {
        console.error('Error uploading fighter image:', error);
      }
      return null;
    }
  }
} 