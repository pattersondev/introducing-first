import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import sharp from 'sharp';
import crypto from 'crypto';

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

  private hashProfileId(profileId: string): string {
    return crypto.createHash('sha256').update(profileId).digest('hex');
  }

  private async checkImageExists(url: string): Promise<boolean> {
    try {
      console.log('Checking if image exists at:', url);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      console.log('Image check status:', response.status);
      return response.status === 200;
    } catch (error) {
      console.error('Error checking image existence:', error);
      return false;
    }
  }

  private async deleteExistingImage(key: string): Promise<boolean> {
    try {
      console.log('Deleting existing image:', key);
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key
        })
      );
      console.log('Successfully deleted existing image');
      return true;
    } catch (error) {
      console.error('Error deleting existing image:', error);
      return false;
    }
  }

  private async checkS3ImageExists(hashedId: string): Promise<string | null> {
    try {
      const key = `fighters/${hashedId}.jpg`;
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key
        })
      );
      return key;
    } catch (error) {
      return null;
    }
  }

  async uploadFighterImage(imageUrl: string, profileId: string): Promise<string | null> {
    try {
      const hashedId = this.hashProfileId(profileId);
      console.log('Hashed profile ID:', hashedId);

      // Check if source image exists
      const imageExists = await this.checkImageExists(imageUrl);
      if (!imageExists) {
        console.log(`Image not found at URL: ${imageUrl}`);
        return null;
      }

      // Check if we already have an image for this fighter
      const existingImageKey = await this.checkS3ImageExists(hashedId);
      if (existingImageKey) {
        console.log('Found existing image, attempting to delete:', existingImageKey);
        const deleteSuccess = await this.deleteExistingImage(existingImageKey);
        if (!deleteSuccess) {
          console.error('Failed to delete existing image, skipping update');
          return `https://${this.bucket}.s3.amazonaws.com/${existingImageKey}`;
        }
      }

      console.log('Downloading new image from:', imageUrl);
      const response = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const buffer = Buffer.from(response.data);

      try {
        console.log('Processing image with Sharp');
        const processedImage = await sharp(buffer)
          .resize(500, 500, {
            fit: 'cover',
            position: 'top',
            withoutEnlargement: true
          })
          .jpeg({ 
            quality: 100,
            progressive: true
          })
          .toBuffer();
        
        // Use hashed profileId in the filename
        const filename = `fighters/${hashedId}.jpg`;
        console.log('Generated filename:', filename);

        const uploadCommand = new PutObjectCommand({
          Bucket: this.bucket,
          Key: filename,
          Body: processedImage,
          ContentType: 'image/jpeg'
        });

        await this.s3Client.send(uploadCommand);
        console.log('S3 upload successful');

        const s3Url = `https://${this.bucket}.s3.amazonaws.com/${filename}`;
        console.log('Generated S3 URL:', s3Url);
        return s3Url;

      } catch (sharpError) {
        console.error('Error processing image with Sharp:', {
          error: sharpError,
          stack: sharpError instanceof Error ? sharpError.stack : undefined
        });
        return null;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error uploading fighter image:', {
          status: error.response?.status,
          url: imageUrl,
          message: error.message,
          response: error.response?.data
        });
      } else {
        console.error('Error uploading fighter image:', {
          error,
          stack: error instanceof Error ? error.stack : undefined
        });
      }
      return null;
    }
  }
} 