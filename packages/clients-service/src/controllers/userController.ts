import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { userService } from '../services';
import {
  CreateUserInput,
  GetUserParams,
  UpdateUserInput,
  UpdateUserParams,
  UpdateProfilePictureInput,
  DepositInput,
  DepositParams,
  WithdrawInput,
  WithdrawParams,
} from '../schemas/userSchema';

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

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params as unknown as UpdateUserParams;
    const input = req.body as UpdateUserInput;

    await userService.updateUser(userId, input);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'User updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfilePicture(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.params as unknown as UpdateUserParams;
    const { profilePictureUrl } = req.body as UpdateProfilePictureInput;

    await userService.updateProfilePicture(userId, profilePictureUrl);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Profile picture updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function deposit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params as unknown as DepositParams;
    const { amount } = req.body as DepositInput;

    const user = await userService.deposit(userId, amount);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        userId: user.id,
        newBalance: user.bankingDetails.balance,
      },
      message: 'Deposit completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params as unknown as WithdrawParams;
    const { amount } = req.body as WithdrawInput;

    const user = await userService.withdraw(userId, amount);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        userId: user.id,
        newBalance: user.bankingDetails.balance,
      },
      message: 'Withdrawal completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
