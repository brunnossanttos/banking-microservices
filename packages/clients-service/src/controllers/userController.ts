import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { userService } from '../services';
import { CreateUserInput, GetUserParams } from '../schemas/userSchema';

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

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params as unknown as GetUserParams;
    const user = await userService.getUserById(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
