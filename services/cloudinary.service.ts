import Constants from 'expo-constants';

export class CloudinaryService {
  static async uploadImage(uri: string): Promise<string> {
    try {
      const cloudName = 'drgnpf0tx'; // Your cloud name
      const uploadPreset = 'abdulmerts'; // Your upload preset name

      const data = new FormData();
      data.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      } as any);

      data.append('upload_preset', uploadPreset);

      console.log('Uploading to:', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: data,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const responseData = await response.json();
      console.log('Upload successful:', responseData);
      return responseData.secure_url;
    } catch (error) {
      console.error('Cloudinary service error:', error);
      throw error;
    }
  }
} 