import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { userService } from '../services';
import { CreateUserInput } from '../schemas/userSchema';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as CreateUserInput;
    const user = await userService.createUser(input);

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: user,
      message: 'User created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
