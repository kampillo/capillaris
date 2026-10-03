const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('reflect-metadata');
require('ts-node').register({ project: path.resolve(__dirname, '../../apps/api/tsconfig.json'), transpileOnly: true });
const { ValidationPipe } = require('@nestjs/common');
const { CreateUserDto } = require('../../apps/api/src/modules/users/dto/create-user.dto');
const { RegisterDto } = require('../../apps/api/src/modules/auth/dto/register.dto');
const { ChangePasswordDto } = require('../../apps/api/src/modules/auth/dto/update-profile.dto');
const { LoginDto } = require('../../apps/api/src/modules/auth/dto/login.dto');

// Actual DTOs and the same options as the HTTP boundary. No service, bcrypt,
// client, network, existing credentials, or database is used by these tests.
const pipe = new ValidationPipe({
  whitelist: true, transform: true, forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: true },
});
const identity = { nombre: 'QAOnly', apellido: 'Ficticio', email: 'validator-only@example.invalid' };
const validate = (metatype, body) => pipe.transform(body, { type: 'body', metatype });
const badRequest = error => error.getStatus() === 400;
const whitespace = [' '.repeat(12), '\t\r\n'.repeat(4), '\u00a0'.repeat(12), '\u2003'.repeat(12), '\ufeff'.repeat(12)];

test('both user creation routes reject missing, empty, null and short passwords without defaults', async () => {
  for (const dto of [CreateUserDto, RegisterDto]) {
    await assert.rejects(validate(dto, { ...identity }), badRequest);
    for (const password of ['', null, 'qax']) {
      await assert.rejects(validate(dto, { ...identity, password }), badRequest);
    }
  }
});

test('both user creation routes reject ASCII and Unicode whitespace-only passwords', async () => {
  for (const dto of [CreateUserDto, RegisterDto]) {
    for (const password of whitespace) {
      await assert.rejects(validate(dto, { ...identity, password }), error =>
        badRequest(error) && error.getResponse().message.includes('La contraseña no puede contener sólo espacios'));
    }
  }
});

test('creation preserves exact valid passwords including leading, trailing and internal whitespace', async () => {
  for (const dto of [CreateUserDto, RegisterDto]) {
    for (const password of ['  QA x  ', '\u00a0QA prueba\u00a0', 'QA\tvalor\nfinal']) {
      const result = await validate(dto, { ...identity, password });
      assert.equal(result.password, password);
    }
  }
});

test('password change rejects a whitespace-only new password and keeps existing length limits', async () => {
  for (const newPassword of [...whitespace, 'Q'.repeat(11), 'Q'.repeat(73)]) {
    await assert.rejects(validate(ChangePasswordDto, { currentPassword: 'existing-synthetic-value', newPassword }), badRequest);
  }
});

test('password change preserves exact valid new and current values without normalization', async () => {
  const currentPassword = '  current QA  ';
  for (const newPassword of ['  nueva QA válida  ', 'Q'.repeat(12), 'Q'.repeat(72)]) {
    const result = await validate(ChangePasswordDto, { currentPassword, newPassword });
    assert.equal(result.currentPassword, currentPassword);
    assert.equal(result.newPassword, newPassword);
  }
});

test('login and current-password validation stay compatible with existing whitespace credentials', async () => {
  const password = ' '.repeat(12);
  const login = await validate(LoginDto, { email: identity.email, password });
  assert.equal(login.password, password);
  const change = await validate(ChangePasswordDto, { currentPassword: password, newPassword: 'nuevo QA válido' });
  assert.equal(change.currentPassword, password);
});
