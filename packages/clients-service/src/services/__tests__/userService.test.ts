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
});
