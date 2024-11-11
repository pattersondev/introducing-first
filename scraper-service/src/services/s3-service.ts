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

  async uploadFighterImage(imageUrl: string): Promise<string | null> {
    try {
      // Check if image exists before attempting download
      const imageExists = await this.checkImageExists(imageUrl);
      if (!imageExists) {
        console.log(`Image not found at URL: ${imageUrl}`);
        return null;
      }

      console.log('Downloading image from:', imageUrl);
      // Download image
      const response = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      console.log('Image download successful, content type:', response.headers['content-type']);

      const buffer = Buffer.from(response.data);
      console.log('Buffer size:', buffer.length);

      try {
        // Process image with sharp
        console.log('Processing image with Sharp');
        const processedImage = await sharp(buffer)
          .resize(350, 254, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();
        
        console.log('Image processed successfully, size:', processedImage.length);

        // Generate unique filename
        const filename = `fighters/${uuidv4()}.jpg`;
        console.log('Generated filename:', filename);

        console.log('Uploading to S3...');
        const uploadCommand = new PutObjectCommand({
          Bucket: this.bucket,
          Key: filename,
          Body: processedImage,
          ContentType: 'image/jpeg'
        });

        console.log('S3 upload command created:', {
          bucket: this.bucket,
          key: filename,
          contentType: 'image/jpeg'
        });

        const uploadResult = await this.s3Client.send(uploadCommand);
        console.log('S3 upload successful:', uploadResult);

        // Return the S3 URL
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