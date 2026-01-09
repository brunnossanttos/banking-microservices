import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().max(255).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2, 'State must be 2 characters').optional(),
  zipCode: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, 'Invalid ZIP code format')
    .optional(),
});

const bankingDetailsSchema = z.object({
  agency: z.string().min(1).max(10),
  account: z.string().min(1).max(20),
  accountType: z.enum(['checking', 'savings']),
});

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(255),
    cpf: z
      .string()
      .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'Invalid CPF format')
      .transform(val => val.replace(/\D/g, '')),
    address: addressSchema.optional(),
    bankingDetails: bankingDetailsSchema,
  }),
});

export const getUserSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z
    .object({
      name: z.string().min(2).max(255).optional(),
      email: z.string().email().optional(),
      address: addressSchema.optional(),
      bankingDetails: bankingDetailsSchema.partial().optional(),
    })
    .refine(data => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const updateProfilePictureSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    profilePictureUrl: z.string().url('Invalid URL format'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type GetUserParams = z.infer<typeof getUserSchema>['params'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type UpdateUserParams = z.infer<typeof updateUserSchema>['params'];
export type UpdateProfilePictureInput = z.infer<typeof updateProfilePictureSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
