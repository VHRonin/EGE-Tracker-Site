import type { ImageInput } from './entities';
import { limits, textValue, ValidationError } from './validation';

export const imageTypes = ['image/png', 'image/jpeg', 'image/webp'] as const;

export async function validateImage(image: ImageInput): Promise<ImageInput> {
  if (!imageTypes.includes(image.mimeType as (typeof imageTypes)[number]))
    throw new ValidationError('Поддерживаются только PNG, JPEG и WebP.');
  textValue(image.filename, 255, 'Имя файла');
  if (
    !image.filename.trim() ||
    !Number.isSafeInteger(image.size) ||
    image.size <= 0 ||
    image.size > limits.imageBytes ||
    image.size !== image.blob.size ||
    image.blob.type !== image.mimeType
  )
    throw new ValidationError(
      'Скриншот должен быть размером от 1 байта до 10 МБ.',
    );
  const bytes = new Uint8Array(await image.blob.slice(0, 12).arrayBuffer());
  const matches = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[index + offset] === byte);
  const valid =
    image.mimeType === 'image/png'
      ? matches([137, 80, 78, 71, 13, 10, 26, 10])
      : image.mimeType === 'image/jpeg'
        ? matches([255, 216, 255])
        : matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8);
  if (!valid)
    throw new ValidationError(
      'Содержимое файла не соответствует выбранному формату изображения.',
    );
  return image;
}
