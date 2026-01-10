import * as userRepository from '../userRepository';
import { getPool } from '../../config/database';

jest.mock('../../config/database');

const mockedGetPool = getPool as jest.MockedFunction<typeof getPool>;

describe('userRepository', () => {
  const mockQuery = jest.fn();

  const mockUserRow = {
    id: 'uuid-123',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    name: 'John Doe',
    cpf: '12345678900',
    address_street: 'Main Street',
    address_number: '123',
    address_complement: 'Apt 4',
    address_neighborhood: 'Downtown',
    address_city: 'São Paulo',
    address_state: 'SP',
    address_zip_code: '01234567',
    banking_agency: '0001',
    banking_account: '12345-6',
    banking_account_type: 'checking' as const,
    balance: '1000.50',
    profile_picture_url: 'https://example.com/photo.jpg',
    status: 'active' as const,
    email_verified: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-02'),
  };

  const expectedUser = {
    id: 'uuid-123',
    email: 'test@example.com',
    name: 'John Doe',
    cpf: '12345678900',
    address: {
      street: 'Main Street',
      number: '123',
      complement: 'Apt 4',
      neighborhood: 'Downtown',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234567',
    },
    bankingDetails: {
      agency: '0001',
      account: '12345-6',
      accountType: 'checking',
      balance: 1000.5,
    },
    profilePictureUrl: 'https://example.com/photo.jpg',
    status: 'active',
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPool.mockReturnValue({ query: mockQuery } as any);
  });

  describe('createUser', () => {
    const createUserData = {
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      name: 'John Doe',
      cpf: '12345678900',
      address: {
        street: 'Main Street',
        number: '123',
        complement: 'Apt 4',
        neighborhood: 'Downtown',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
      },
      bankingDetails: {
        agency: '0001',
        account: '12345-6',
        accountType: 'checking' as const,
      },
    };

    it('should insert user and return mapped user', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow] });

      const result = await userRepository.createUser(createUserData);

      expect(result).toEqual(expectedUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          createUserData.email,
          createUserData.passwordHash,
          createUserData.name,
          createUserData.cpf,
        ]),
      );
    });

    it('should sanitize zipCode by removing non-digits', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow] });

      await userRepository.createUser(createUserData);

      const callArgs = mockQuery.mock.calls[0][1];
      expect(callArgs[10]).toBe('01234567');
    });

    it('should handle null address fields', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow] });

      await userRepository.createUser({
        ...createUserData,
        address: undefined,
      });

      const callArgs = mockQuery.mock.calls[0][1];
      expect(callArgs[4]).toBeNull(); // street
      expect(callArgs[5]).toBeNull(); // number
      expect(callArgs[10]).toBeNull(); // zipCode
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow] });

      const result = await userRepository.findByEmail('test@example.com');

      expect(result).toEqual(expectedUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        ['test@example.com'],
      );
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userRepository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByCpf', () => {
    it('should return user when found', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow] });

      const result = await userRepository.findByCpf('12345678900');

      expect(result).toEqual(expectedUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE cpf = $1'),
        ['12345678900'],
      );
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userRepository.findByCpf('00000000000');

      expect(result).toBeNull();
    });
  });

  describe('findByBankingDetails', () => {
    it('should return user when found', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow] });

      const result = await userRepository.findByBankingDetails('0001', '12345-6');

      expect(result).toEqual(expectedUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE banking_agency = $1 AND banking_account = $2'),
        ['0001', '12345-6'],
      );
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userRepository.findByBankingDetails('9999', '00000-0');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockQuery.mockResolvedValue({ rows: [mockUserRow] });

      const result = await userRepository.findById('uuid-123');

      expect(result).toEqual(expectedUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['uuid-123'],
      );
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userRepository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('mapRowToUser (via createUser)', () => {
    it('should convert null fields to undefined', async () => {
      const rowWithNulls = {
        ...mockUserRow,
        address_street: null,
        address_number: null,
        address_complement: null,
        address_neighborhood: null,
        address_city: null,
        address_state: null,
        address_zip_code: null,
        profile_picture_url: null,
      };
      mockQuery.mockResolvedValue({ rows: [rowWithNulls] });

      const result = await userRepository.findByEmail('test@example.com');

      expect(result?.address).toEqual({
        street: undefined,
        number: undefined,
        complement: undefined,
        neighborhood: undefined,
        city: undefined,
        state: undefined,
        zipCode: undefined,
      });
      expect(result?.profilePictureUrl).toBeUndefined();
    });

    it('should parse balance string to number', async () => {
      const rowWithBalance = { ...mockUserRow, balance: '999.99' };
      mockQuery.mockResolvedValue({ rows: [rowWithBalance] });

      const result = await userRepository.findByEmail('test@example.com');

      expect(result?.bankingDetails.balance).toBe(999.99);
      expect(typeof result?.bankingDetails.balance).toBe('number');
    });
  });

  describe('updateUser', () => {
    it('should update name only', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await userRepository.updateUser('uuid-123', { name: 'New Name' });

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['New Name', 'uuid-123'],
      );
    });

    it('should update email only', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await userRepository.updateUser('uuid-123', { email: 'new@example.com' });

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('email = $1'),
        ['new@example.com', 'uuid-123'],
      );
    });

    it('should update banking details', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await userRepository.updateUser('uuid-123', {
        bankingDetails: { agency: '0002', account: '99999-9' },
      });

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('banking_agency'),
        expect.arrayContaining(['0002', '99999-9']),
      );
    });

    it('should update multiple fields', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await userRepository.updateUser('uuid-123', {
        name: 'New Name',
        email: 'new@example.com',
      });

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/name = \$1.*email = \$2/s),
        ['New Name', 'new@example.com', 'uuid-123'],
      );
    });

    it('should return false when no fields to update', async () => {
      const result = await userRepository.updateUser('uuid-123', {});

      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await userRepository.updateUser('non-existent-id', { name: 'New Name' });

      expect(result).toBe(false);
    });
  });

  describe('updateProfilePicture', () => {
    it('should update profile picture and return true', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await userRepository.updateProfilePicture(
        'uuid-123',
        'https://example.com/new-photo.jpg',
      );

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['https://example.com/new-photo.jpg', 'uuid-123'],
      );
    });

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await userRepository.updateProfilePicture(
        'non-existent-id',
        'https://example.com/photo.jpg',
      );

      expect(result).toBe(false);
    });
  });
});
