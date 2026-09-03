import { validate } from 'class-validator';
import { RegisterDto } from '../src/3_interface_adapters/controllers/auth/dto/RegisterDto';
import { LoginDto } from '../src/3_interface_adapters/controllers/auth/dto/login.dto';

const validPassword = 'Password1!';

async function validationMessages(value: object): Promise<string[]> {
  const errors = await validate(value);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('authentication input validation', () => {
  it('accepts valid names and a password with the required complexity', async () => {
    const dto = Object.assign(new RegisterDto(), {
      email: 'user@example.com',
      password: validPassword,
      firstName: 'Cesar',
      lastName: 'Gonzalez',
    });

    await expect(validationMessages(dto)).resolves.toEqual([]);
  });

  it('enforces the first-name and last-name limits', async () => {
    const dto = Object.assign(new RegisterDto(), {
      email: 'user@example.com',
      password: validPassword,
      firstName: 'a'.repeat(31),
      lastName: 'a'.repeat(61),
    });

    const messages = await validationMessages(dto);

    expect(messages).toEqual(
      expect.arrayContaining([
        'the first name must be at most 30 characters',
        'the last name must be at most 60 characters',
      ]),
    );
  });

  it('rejects script markup in names', async () => {
    const dto = Object.assign(new RegisterDto(), {
      email: 'user@example.com',
      password: validPassword,
      firstName: '<script>alert(1)</script>',
      lastName: 'Valid',
    });

    const messages = await validationMessages(dto);

    expect(messages).toContain('the first name contains invalid characters');
  });

  it.each([
    ['too short', 'Aa1!aaa'],
    ['too long', `Aa1!${'a'.repeat(29)}`],
    ['without uppercase', 'password1!'],
    ['without lowercase', 'PASSWORD1!'],
    ['without number', 'Password!'],
    ['without special character', 'Password1'],
  ])('rejects a password %s', async (_caseName, password) => {
    const dto = Object.assign(new RegisterDto(), {
      email: 'user@example.com',
      password,
      firstName: 'Cesar',
    });

    const messages = await validationMessages(dto);

    expect(messages.length).toBeGreaterThan(0);
  });

  it('rejects unknown login properties', async () => {
    const dto = Object.assign(new LoginDto(), {
      email: 'user@example.com',
      password: validPassword,
      maliciousScript: '<script>alert(1)</script>',
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'maliciousScript',
          constraints: expect.objectContaining({
            whitelistValidation: expect.any(String),
          }),
        }),
      ]),
    );
  });
});
