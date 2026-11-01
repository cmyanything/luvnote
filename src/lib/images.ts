export async function jpeg(
  source: string,
  max: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('canvas_unavailable');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('image_unreadable'));
    image.src = source;
  });
}

export async function readPhoto(file: File, max = 1080): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    return await jpeg(url, max, 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
