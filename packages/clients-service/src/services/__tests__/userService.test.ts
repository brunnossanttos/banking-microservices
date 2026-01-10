import { AppError } from '@banking/shared';
import * as userService from '../userService';
import * as userRepository from '../../repositories/userRepository';
import bcrypt from 'bcrypt';

jest.mock('../../repositories/userRepository');
jest.mock('bcrypt');

const mockedRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('userService', () => {
  describe('createUser', () => {
    const validInput = {
      email: 'test@example.com',
      password: 'password123',
      name: 'John Doe',
      cpf: '123.456.789-00',
      bankingDetails: {
        agency: '0001',
        account: '12345-6',
        accountType: 'checking' as const,
      },
    };

    const createdUser = {
      id: 'uuid-123',
      email: 'test@example.com',
      name: 'John Doe',
      cpf: '12345678900',
      address: {},
      bankingDetails: {
        agency: '0001',
        account: '12345-6',
        accountType: 'checking' as const,
        balance: 0,
      },
      status: 'pending_verification' as const,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockedRepository.findByEmail.mockResolvedValue(null);
      mockedRepository.findByCpf.mockResolvedValue(null);
      mockedRepository.findByBankingDetails.mockResolvedValue(null);
      mockedRepository.createUser.mockResolvedValue(createdUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
    });

    it('should create user successfully', async () => {
      const result = await userService.createUser(validInput);

      expect(result).toEqual(createdUser);
      expect(mockedRepository.createUser).toHaveBeenCalledWith({
        email: validInput.email,
        passwordHash: 'hashed_password',
        name: validInput.name,
        cpf: '12345678900',
        address: undefined,
        bankingDetails: validInput.bankingDetails,
      });
    });

    it('should sanitize CPF before saving', async () => {
      await userService.createUser(validInput);

      expect(mockedRepository.findByCpf).toHaveBeenCalledWith('12345678900');
      expect(mockedRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ cpf: '12345678900' }),
      );
    });

    it('should hash password before saving', async () => {
      await userService.createUser(validInput);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockedRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'hashed_password' }),
      );
    });

    it('should throw conflict error when email already exists', async () => {
      mockedRepository.findByEmail.mockResolvedValue(createdUser);

      await expect(userService.createUser(validInput)).rejects.toThrow(AppError);
      await expect(userService.createUser(validInput)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Email already registered',
      });
      expect(mockedRepository.createUser).not.toHaveBeenCalled();
    });

    it('should throw conflict error when CPF already exists', async () => {
      mockedRepository.findByCpf.mockResolvedValue(createdUser);

      await expect(userService.createUser(validInput)).rejects.toThrow(AppError);
      await expect(userService.createUser(validInput)).rejects.toMatchObject({
        statusCode: 409,
        message: 'CPF already registered',
      });
      expect(mockedRepository.createUser).not.toHaveBeenCalled();
    });

    it('should throw conflict error when banking details already exist', async () => {
      mockedRepository.findByBankingDetails.mockResolvedValue(createdUser);

      await expect(userService.createUser(validInput)).rejects.toThrow(AppError);
      await expect(userService.createUser(validInput)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Banking details already in use',
      });
      expect(mockedRepository.createUser).not.toHaveBeenCalled();
    });

    it('should check email, cpf, and banking details in order', async () => {
      mockedRepository.findByEmail.mockResolvedValue(createdUser);

      await expect(userService.createUser(validInput)).rejects.toThrow();

      expect(mockedRepository.findByEmail).toHaveBeenCalled();
      expect(mockedRepository.findByCpf).not.toHaveBeenCalled();
      expect(mockedRepository.findByBankingDetails).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    const existingUser = {
      id: 'uuid-123',
      email: 'test@example.com',
      name: 'John Doe',
      cpf: '12345678900',
      address: {},
      bankingDetails: {
        agency: '0001',
        account: '12345-6',
        accountType: 'checking' as const,
        balance: 1000,
      },
      status: 'active' as const,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return user when found', async () => {
      mockedRepository.findById.mockResolvedValue(existingUser);

      const result = await userService.getUserById('uuid-123');

      expect(result).toEqual(existingUser);
      expect(mockedRepository.findById).toHaveBeenCalledWith('uuid-123');
    });

    it('should throw not found error when user does not exist', async () => {
      mockedRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById('non-existent-id')).rejects.toThrow(AppError);
      await expect(userService.getUserById('non-existent-id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });
  });

  describe('updateUser', () => {
    const existingUser = {
      id: 'uuid-123',
      email: 'test@example.com',
      name: 'John Doe',
      cpf: '12345678900',
      address: {},
      bankingDetails: {
        agency: '0001',
        account: '12345-6',
        accountType: 'checking' as const,
        balance: 1000,
      },
      status: 'active' as const,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockedRepository.findById.mockResolvedValue(existingUser);
      mockedRepository.updateUser.mockResolvedValue(true);
    });

    it('should update user successfully', async () => {
      await userService.updateUser('uuid-123', { name: 'New Name' });

      expect(mockedRepository.updateUser).toHaveBeenCalledWith('uuid-123', {
        name: 'New Name',
        email: undefined,
        bankingDetails: undefined,
      });
    });

    it('should throw not found error when user does not exist', async () => {
      mockedRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser('non-existent-id', { name: 'New Name' })).rejects.toThrow(AppError);
      await expect(userService.updateUser('non-existent-id', { name: 'New Name' })).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });

    it('should throw conflict error when new email already exists', async () => {
      mockedRepository.findByEmail.mockResolvedValue({ ...existingUser, id: 'other-id' });

      await expect(userService.updateUser('uuid-123', { email: 'taken@example.com' })).rejects.toThrow(AppError);
      await expect(userService.updateUser('uuid-123', { email: 'taken@example.com' })).rejects.toMatchObject({
        statusCode: 409,
        message: 'Email already registered',
      });
      expect(mockedRepository.updateUser).not.toHaveBeenCalled();
    });

    it('should not check email uniqueness when email unchanged', async () => {
      await userService.updateUser('uuid-123', { email: 'test@example.com' });

      expect(mockedRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockedRepository.updateUser).toHaveBeenCalled();
    });

    it('should throw conflict error when new banking details already exist', async () => {
      mockedRepository.findByBankingDetails.mockResolvedValue({ ...existingUser, id: 'other-id' });

      await expect(
        userService.updateUser('uuid-123', { bankingDetails: { agency: '0002', account: '99999-9' } }),
      ).rejects.toThrow(AppError);
      await expect(
        userService.updateUser('uuid-123', { bankingDetails: { agency: '0002', account: '99999-9' } }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Banking details already in use',
      });
    });

    it('should not check banking uniqueness when banking details unchanged', async () => {
      await userService.updateUser('uuid-123', {
        bankingDetails: { agency: '0001', account: '12345-6' },
      });

      expect(mockedRepository.findByBankingDetails).not.toHaveBeenCalled();
      expect(mockedRepository.updateUser).toHaveBeenCalled();
    });

    it('should allow same user to keep their own banking details', async () => {
      mockedRepository.findByBankingDetails.mockResolvedValue(existingUser);

      await userService.updateUser('uuid-123', {
        bankingDetails: { agency: '0002' },
      });

      expect(mockedRepository.updateUser).toHaveBeenCalled();
    });
  });
});
