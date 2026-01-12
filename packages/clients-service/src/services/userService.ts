import bcrypt from 'bcrypt';
import { AppError } from '@banking/shared';
import { User } from '../types';
import { CreateUserInput, UpdateUserInput } from '../schemas/userSchema';
import * as userRepository from '../repositories/userRepository';
import * as cacheService from './cacheService';
import * as eventService from './eventService';
import { CACHE_KEYS } from './cacheService';

const SALT_ROUNDS = 10;
const USER_CACHE_TTL = 300; // 5 minutes

function sanitizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export async function createUser(input: CreateUserInput): Promise<Omit<User, 'password'>> {
  const cpf = sanitizeCpf(input.cpf);

  const existingEmail = await userRepository.findByEmail(input.email);
  if (existingEmail) {
    throw AppError.conflict('Email already registered');
  }

  const existingCpf = await userRepository.findByCpf(cpf);
  if (existingCpf) {
    throw AppError.conflict('CPF already registered');
  }

  const existingBanking = await userRepository.findByBankingDetails(
    input.bankingDetails.agency,
    input.bankingDetails.account,
  );
  if (existingBanking) {
    throw AppError.conflict('Banking details already in use');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await userRepository.createUser({
    email: input.email,
    passwordHash,
    name: input.name,
    cpf,
    address: input.address,
    bankingDetails: input.bankingDetails,
  });

  eventService.publishUserCreated(user);

  return user;
}

export async function getUserById(id: string): Promise<Omit<User, 'password'>> {
  const cacheKey = CACHE_KEYS.USER(id);
  const cachedUser = await cacheService.get<Omit<User, 'password'>>(cacheKey);

  if (cachedUser) {
    return cachedUser;
  }

  const user = await userRepository.findById(id);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  await cacheService.set(cacheKey, user, USER_CACHE_TTL);

  return user;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<void> {
  const user = await userRepository.findById(id);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  if (input.email && input.email !== user.email) {
    const existingEmail = await userRepository.findByEmail(input.email);
    if (existingEmail) {
      throw AppError.conflict('Email already registered');
    }
  }

  if (input.bankingDetails) {
    const newAgency = input.bankingDetails.agency ?? user.bankingDetails.agency;
    const newAccount = input.bankingDetails.account ?? user.bankingDetails.account;

    const isBankingChanged =
      newAgency !== user.bankingDetails.agency || newAccount !== user.bankingDetails.account;

    if (isBankingChanged) {
      const existingBanking = await userRepository.findByBankingDetails(newAgency, newAccount);
      if (existingBanking && existingBanking.id !== id) {
        throw AppError.conflict('Banking details already in use');
      }
    }
  }

  const hasBankingChanges =
    input.bankingDetails &&
    (input.bankingDetails.agency !== user.bankingDetails.agency ||
      input.bankingDetails.account !== user.bankingDetails.account ||
      input.bankingDetails.accountType !== user.bankingDetails.accountType);

  await userRepository.updateUser(id, {
    name: input.name,
    email: input.email,
    bankingDetails: input.bankingDetails,
  });

  await cacheService.invalidateUser(id, user.email, user.cpf);

  const changes: Record<string, unknown> = {};
  if (input.name) changes.name = input.name;
  if (input.email) changes.email = input.email;
  if (input.bankingDetails) changes.bankingDetails = input.bankingDetails;

  eventService.publishUserUpdated(user, changes);

  if (hasBankingChanges) {
    eventService.publishBankingDetailsUpdated(
      user.id,
      user.email,
      user.name,
      input.bankingDetails!,
    );
  }
}

export async function updateProfilePicture(id: string, profilePictureUrl: string): Promise<void> {
  const user = await userRepository.findById(id);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  await userRepository.updateProfilePicture(id, profilePictureUrl);

  await cacheService.invalidateUser(id, user.email, user.cpf);
}

export async function deposit(id: string, amount: number): Promise<Omit<User, 'password'>> {
  if (amount <= 0) {
    throw AppError.badRequest('Amount must be greater than zero');
  }

  const updatedUser = await userRepository.updateBalance(id, amount, 'credit');

  if (!updatedUser) {
    throw AppError.notFound('User not found');
  }

  await cacheService.invalidateUser(id, updatedUser.email, updatedUser.cpf);

  return updatedUser;
}

export async function withdraw(id: string, amount: number): Promise<Omit<User, 'password'>> {
  if (amount <= 0) {
    throw AppError.badRequest('Amount must be greater than zero');
  }

  const user = await userRepository.findById(id);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  if (user.bankingDetails.balance < amount) {
    throw AppError.badRequest('Insufficient balance');
  }

  const updatedUser = await userRepository.updateBalance(id, amount, 'debit');

  if (!updatedUser) {
    throw AppError.badRequest('Withdrawal failed');
  }

  await cacheService.invalidateUser(id, updatedUser.email, updatedUser.cpf);

  return updatedUser;
}
