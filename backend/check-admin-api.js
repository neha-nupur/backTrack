const http = require('http');

const get = (path, token) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api' + path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(JSON.parse(body)));
      }
    );
    req.on('error', reject);
    req.end();
  });

const post = (path, data) =>
  new Promise((resolve, reject) => {
    const d = JSON.stringify(data);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api' + path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(d),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(JSON.parse(body)));
      }
    );
    req.on('error', reject);
    req.write(d);
    req.end();
  });

(async () => {
  // Admin login
  const loginRes = await post('/auth/admin/login', {
    email: 'admin@college.edu',
    password: 'Admin@BlackBox2026',
  });
  const token = loginRes.data?.token;
  console.log('Admin login:', loginRes.success ? 'OK' : 'FAIL', loginRes.message || '');
  if (!token) {
    console.log('Full login response:', JSON.stringify(loginRes, null, 2));
    process.exit(1);
  }

  // Get all participants
  console.log('\n=== GET /admin/participants ===');
  const pRes = await get('/admin/participants', token);
  console.log('Success:', pRes.success);
  console.log('Total participants:', pRes.data?.pagination?.total);
  console.log('Participants:');
  (pRes.data?.participants || []).forEach(p => {
    console.log(`  - ${p.name} (${p.email}) [${p.status}]`);
  });

  // Get dashboard stats
  console.log('\n=== GET /admin/dashboard ===');
  const dRes = await get('/admin/dashboard', token);
  console.log('Dashboard stats:', JSON.stringify(dRes.data, null, 2));

  process.exit(0);
})();
