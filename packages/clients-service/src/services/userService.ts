import bcrypt from 'bcrypt';
import { AppError } from '@banking/shared';
import { User } from '../types';
import { CreateUserInput, UpdateUserInput } from '../schemas/userSchema';
import * as userRepository from '../repositories/userRepository';

const SALT_ROUNDS = 10;

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

  return user;
}

export async function getUserById(id: string): Promise<Omit<User, 'password'>> {
  const user = await userRepository.findById(id);

  if (!user) {
    throw AppError.notFound('User not found');
  }

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

  await userRepository.updateUser(id, {
    name: input.name,
    email: input.email,
    bankingDetails: input.bankingDetails,
  });
}

export async function updateProfilePicture(id: string, profilePictureUrl: string): Promise<void> {
  const user = await userRepository.findById(id);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  await userRepository.updateProfilePicture(id, profilePictureUrl);
}
