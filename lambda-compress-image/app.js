const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

// Initialize the AWS S3 client for the desired region
const s3 = new S3Client({ region: 'us-east-1' });

// Define the destination bucket where compressed images will be saved
const DEST_BUCKET = 'processed-images-825765422669';

const streamToBuffer = async (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));        
    stream.on('end', () => resolve(Buffer.concat(chunks)));  
    stream.on('error', reject);                             
  });
};

/**
 * Main Lambda handler triggered when a new image is uploaded to the source S3 bucket.
 * The function reads the uploaded image, compresses it, and stores it in another bucket.
 */
exports.lambdaHandler = async (event) => {
  try {
    // Get the S3 object metadata from the first event record
    const record = event.Records[0];
    const sourceBucket = record.s3.bucket.name;
    const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Received new image upload: ${objectKey} from bucket: ${sourceBucket}`);

    // Download the image from the source S3 bucket
    const s3Object = await s3.send(
      new GetObjectCommand({
        Bucket: sourceBucket,
        Key: objectKey,
      })
    );

    console.log('Original image retrieved from S3');

    // Convert the incoming stream from S3 to a usable buffer
    const imageBuffer = await streamToBuffer(s3Object.Body);

    // Compress the image using sharp (resize + reduce quality)
    const compressedBuffer = await sharp(imageBuffer)
      .resize({ width: 400 })       // Resize to a max width of 800px (auto height)
      .jpeg({ quality: 70 })        // Convert to JPEG with 70% quality
      .toBuffer();                  // Output as a Buffer

    console.log('Image successfully compressed using sharp');

    // Upload the compressed image to the destination bucket
    await s3.send(
      new PutObjectCommand({
        Bucket: DEST_BUCKET,
        Key: `compressed-${objectKey}`,  // Prefix added to differentiate files
        Body: compressedBuffer,          // The compressed image data
        ContentType: 'image/jpeg',       // Ensure correct content type
        ContentDisposition: 'attachment', // Optional: set content disposition
      })
    );

    console.log(`Compressed image uploaded to ${DEST_BUCKET} as compressed-${objectKey}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Image successfully processed and stored.' }),
    };
  } catch (error) {
    console.error('Error while processing the image:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An error occurred while processing the image.' }),
    };
  }
};
