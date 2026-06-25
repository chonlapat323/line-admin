// ทดสอบ api.login() และ request() wrapper ใน lib/api.ts

// mock fetch ก่อน import เพื่อให้ api.ts ใช้ mock ตั้งแต่ต้น
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { api } from './api';

// ─────────────────────────────────────────────
// helper
// ─────────────────────────────────────────────

function makeResponse(body: unknown, ok = true, status = 200, statusText = 'OK') {
  return {
    ok,
    status,
    statusText,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ─────────────────────────────────────────────
// api.login — สำเร็จ
// ─────────────────────────────────────────────

describe('api.login — สำเร็จ', () => {
  it('คืน token และ user object', async () => {
    const payload = { token: 'jwt.abc', user: { id: '1', email: 'a@b.com', fullName: 'Test', role: 'user' } };
    mockFetch.mockResolvedValue(makeResponse(payload));

    const result = await api.login('a@b.com', 'pass123');

    expect(result).toEqual(payload);
  });

  it('ส่ง POST ไปยัง /auth/login', async () => {
    mockFetch.mockResolvedValue(makeResponse({ token: 't', user: {} }));

    await api.login('a@b.com', 'pass');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/auth/login');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
  });

  it('ส่ง email และ password ใน body', async () => {
    mockFetch.mockResolvedValue(makeResponse({ token: 't', user: {} }));

    await api.login('sales@beautyup.com', 'mypassword');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ email: 'sales@beautyup.com', password: 'mypassword' });
  });

  it('ส่ง Content-Type: application/json', async () => {
    mockFetch.mockResolvedValue(makeResponse({ token: 't', user: {} }));

    await api.login('a@b.com', 'pass');

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('login request ไม่มี Authorization header (ยังไม่ login)', async () => {
    mockFetch.mockResolvedValue(makeResponse({ token: 't', user: {} }));

    await api.login('a@b.com', 'pass');

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// api.login — ล้มเหลว
// ─────────────────────────────────────────────

describe('api.login — ล้มเหลว', () => {
  it('server ตอบ 401 พร้อม message → throw Error พร้อมข้อความ', async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, false, 401, 'Unauthorized'),
    );

    await expect(api.login('a@b.com', 'wrong')).rejects.toThrow('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  });

  it('server ตอบ 500 ไม่มี JSON body → throw Error ด้วย statusText', async () => {
    const badRes = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: jest.fn().mockRejectedValue(new SyntaxError('not json')),
    } as unknown as Response;
    mockFetch.mockResolvedValue(badRes);

    await expect(api.login('a@b.com', 'pass')).rejects.toThrow('Internal Server Error');
  });

  it('fetch ล้มเหลว (network error) → throw', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(api.login('a@b.com', 'pass')).rejects.toThrow('Network error');
  });
});

// ─────────────────────────────────────────────
// Authorization header injection
// ─────────────────────────────────────────────

describe('Authorization header', () => {
  it('ถ้ามี token ใน localStorage → ส่ง Bearer token', async () => {
    localStorage.setItem('token', 'my.jwt.token');
    mockFetch.mockResolvedValue(makeResponse([]));

    await api.getUsers();

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer my.jwt.token');
  });

  it('ถ้าไม่มี token ใน localStorage → ไม่มี Authorization header', async () => {
    mockFetch.mockResolvedValue(makeResponse([]));

    await api.getUsers();

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });
});
