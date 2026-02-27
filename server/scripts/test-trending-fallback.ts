import axios from 'axios';

const API_URL = 'http://localhost:3001';

async function testTrendingFallback() {
    console.log('Testing Trending Fallback...');

    try {
        const res = await axios.get(`${API_URL}/terms/trending/now`);
        const terms = res.data;

        console.log(`[INFO] Received ${terms.length} terms.`);

        if (!Array.isArray(terms)) {
            console.log('[FAIL] Response is not an array.');
            return;
        }

        if (terms.length === 0) {
            console.log('[FAIL] No terms returned. Fallback might not be working (or DB is empty).');
        } else {
            console.log('[PASS] Terms returned successfully.');
            terms.forEach((t: any, i: number) => {
                console.log(`  ${i + 1}. ${t.word} (Views: ${t.trend === 'up' ? 'Trending' : 'Stable/Fallback'}, Upvotes: ${t.upvotes})`);
            });
        }

    } catch (error: any) {
        console.log('[FAIL] Request failed:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        }
    }
}

testTrendingFallback();
