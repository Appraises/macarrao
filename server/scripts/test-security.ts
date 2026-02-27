import axios from 'axios';

const API_URL = 'http://localhost:3001'; // Assuming 3001 based on error log, or 3000 if that was a fluke. I'll try 3001 first.

async function testSecurity() {
    console.log('Starting Security Audit...');

    // 1. Check Security Headers
    try {
        const res = await axios.get(`${API_URL}/`);
        console.log('[INFO] Root endpoint accessible.');
        if (res.headers['x-dns-prefetch-control'] && res.headers['x-frame-options']) {
            console.log('[PASS] Security headers (Helmet) detected.');
        } else {
            console.log('[FAIL] Security headers missing.');
            console.log('Headers:', res.headers);
        }
    } catch (error) {
        console.log('[FAIL] Could not connect to server at ' + API_URL);
        // Try 3000 just in case
        return;
    }

    // 2. Login as Admin
    let adminToken = '';
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@dicionariogamer.com',
            password: 'admin'
        });
        adminToken = res.data.token;
        console.log('[PASS] Admin login successful.');
    } catch (error) {
        console.log('[FAIL] Admin login failed.');
        console.error(error);
        return;
    }

    // 3. Register/Login as User
    let userToken = '';
    const userEmail = `testuser_${Date.now()}@example.com`;
    try {
        const res = await axios.post(`${API_URL}/auth/register`, {
            name: 'Test User',
            email: userEmail,
            password: 'password123'
        });
        userToken = res.data.token;
        console.log('[PASS] User registration successful.');
    } catch (error) {
        console.log('[FAIL] User registration failed.');
        console.error(error);
        return;
    }

    // 4. Test Dashboard Access (Admin Only)
    // 4a. No Token
    try {
        await axios.get(`${API_URL}/dashboard/stats`);
        console.log('[FAIL] /dashboard/stats accessible without token.');
    } catch (error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('[PASS] /dashboard/stats blocked without token (' + error.response.status + ').');
        } else {
            console.log('[FAIL] Unexpected error for /dashboard/stats without token:', error.message);
        }
    }

    // 4b. User Token
    try {
        await axios.get(`${API_URL}/dashboard/stats`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('[FAIL] /dashboard/stats accessible with USER token.');
    } catch (error: any) {
        if (error.response?.status === 403) {
            console.log('[PASS] /dashboard/stats blocked with USER token (403).');
        } else {
            console.log('[FAIL] Unexpected error for /dashboard/stats with USER token:', error.message);
        }
    }

    // 4c. Admin Token
    try {
        await axios.get(`${API_URL}/dashboard/stats`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('[PASS] /dashboard/stats accessible with ADMIN token.');
    } catch (error: any) {
        console.log('[FAIL] /dashboard/stats blocked with ADMIN token:', error.message);
    }

    console.log('Security Audit Complete.');
}

testSecurity();
