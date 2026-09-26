import { type ZodType } from 'zod'
import { type FieldValues, type Resolver } from 'react-hook-form'

/**
 * Lightweight, zero-dependency Zod resolver for React Hook Form.
 * Directly integrates Zod's safeParseAsync with React Hook Form's resolver interface
 * without requiring external resolver libraries.
 */
export function zodResolver<T extends FieldValues>(
  schema: ZodType<T, any, any>
): Resolver<T> {
  return async (values) => {
    const result = await schema.safeParseAsync(values)

    if (result.success) {
      return {
        values: result.data,
        errors: {},
      }
    }

    const errors: Record<string, any> = {}

    for (const issue of result.error.issues) {
      const fieldName = issue.path[0] ? String(issue.path[0]) : 'root'
      if (!errors[fieldName]) {
        errors[fieldName] = {
          type: issue.code,
          message: issue.message,
        }
      }
    }

    return {
      values: {} as T,
      errors,
    }
  }
}
