/**
 * Generate blur data URL from image file
 * Creates a tiny blurred version of the image for placeholder use
 */
export async function generateBlurDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.onload = async () => {
          // Create canvas with tiny size (10px width, maintain aspect ratio)
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          const targetWidth = 10;
          const targetHeight = Math.round((img.height / img.width) * targetWidth);
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Draw scaled down image
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Apply blur effect
          ctx.filter = 'blur(2px)';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Convert to base64
          const blurDataURL = canvas.toDataURL('image/jpeg', 0.5);
          resolve(blurDataURL);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
