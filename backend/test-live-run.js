const http = require('http');

const post = (path, data, token) =>
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
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(d);
    req.end();
  });

(async () => {
  const loginRes = await post('/auth/login', {
    email: 'komal@gmail.com',
    password: 'Participant@2026',
  });
  const token = loginRes.data?.data?.token;

  console.log('--- Testing Live API for Valid Parentheses (6a897e70100045831129bf41) ---');

  const testInputs = ['(())]', '()', '45', '(('];
  for (const input of testInputs) {
    const res = await post(
      '/events/6a897cf5100045831129bef0/challenges/6a897e70100045831129bf41/execute',
      { userInput: input },
      token
    );
    const exec = res.data?.data?.execution;
    console.log(
      'Input: "' +
        input +
        '" -> Success: ' +
        exec?.success +
        ' | Output: "' +
        exec?.output +
        '" | Error: ' +
        (exec?.error ? JSON.stringify(exec.error) : 'none')
    );
  }

  process.exit(0);
})();
