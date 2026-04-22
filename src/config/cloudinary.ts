import { v2 as cloudinary } from 'cloudinary';

// Configure on first import — env vars loaded by server.ts dotenv.config()
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a base64 image to Cloudinary
 * @param base64Data - The base64 data URL string (e.g. "data:image/jpeg;base64,...")
 * @param folder - The Cloudinary folder to upload to
 * @returns The secure URL of the uploaded image
 */
export const uploadToCloudinary = async (base64Data: string, folder: string): Promise<string> => {
    console.log(`[Cloudinary] Uploading to folder: ${folder}, data length: ${base64Data.length}`);
    console.log(`[Cloudinary] Config: cloud_name=${process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING'}, api_key=${process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING'}, api_secret=${process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'}`);

    const result = await cloudinary.uploader.upload(base64Data, {
        folder,
        resource_type: 'image',
    });
    return result.secure_url;
};

export default cloudinary;
