import { validateImage } from '../domain/images';
import { ValidationError } from '../domain/validation';
import type { ImageInput } from '../domain/entities';

export async function prepareScreenshot(file: File) {
  const image = await validateImage({
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    blob: file,
  });
  await decodeScreenshot(image);
  return image;
}

export async function decodeScreenshot(image: ImageInput) {
  const url = URL.createObjectURL(image.blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const element = new Image();
      element.onload = () => {
        if (
          !element.naturalWidth ||
          element.naturalWidth * element.naturalHeight > 40_000_000
        )
          reject(
            new ValidationError(
              'Разрешение скриншота слишком большое. Используйте изображение до 40 мегапикселей.',
            ),
          );
        else resolve();
      };
      element.onerror = () =>
        reject(
          new ValidationError(
            'Не удалось прочитать изображение. Выберите другой файл.',
          ),
        );
      element.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
