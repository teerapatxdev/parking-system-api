import { Transform, type TransformFnParams } from 'class-transformer';

export function Trim(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams): unknown => {
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) {
      return (value as unknown[]).map((v) => (typeof v === 'string' ? v.trim() : v));
    }
    return value;
  });
}
