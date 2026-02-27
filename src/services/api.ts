import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

// Add request interceptor to include token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user'); // If user data is stored
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const getGames = async () => {
    const response = await api.get('/games');
    return response.data;
};

// ... (existing code)

export const verifyEmail = async (token: string) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
};

export default api;

export const getGameBySlug = async (slug: string) => {
    const response = await api.get(`/games/${slug}`);
    return response.data;
};

export const getTerms = async (gameId?: string) => {
    const response = await api.get('/terms', { params: { gameId, verified: true } });
    return response.data;
};

export const getPendingTerms = async () => {
    const response = await api.get('/terms', { params: { verified: false } });
    return response.data;
};

export const getTermBySlug = async (slug: string) => {
    const response = await api.get(`/terms/${slug}`);
    return response.data;
};

export const createTerm = async (data: any) => {
    const response = await api.post('/terms', data);
    return response.data;
};

export const verifyTerm = async (id: string) => {
    const response = await api.patch(`/terms/${id}/verify`);
    return response.data;
};

export const rejectTerm = async (id: string) => {
    const response = await api.delete(`/terms/${id}`);
    return response.data;
};

export const getNews = async () => {
    const response = await api.get('/news');
    return response.data;
};

export const getNewsById = async (id: string) => {
    const response = await api.get(`/news/${id}`);
    return response.data;
};

export const getComments = async (newsId: string) => {
    const response = await api.get(`/comments/${newsId}`);
    return response.data;
};

export const createComment = async (newsId: string, content: string) => {
    const response = await api.post('/comments', { newsId, content });
    return response.data;
};


export const getDashboardStats = async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
};

export const getDashboardCharts = async () => {
    const response = await api.get('/dashboard/charts');
    return response.data;
};

export const getUsers = async () => {
    const response = await api.get('/dashboard/users');
    return response.data;
};

export const login = async (credentials: any) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
};

export const registerUser = async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
};

export const getAllTerms = async () => {
    const response = await api.get('/terms');
    return response.data;
};

export const updateTerm = async (id: string, data: any) => {
    const response = await api.put(`/terms/${id}`, data);
    return response.data;
};

export const recordTermView = async (id: string) => {
    const response = await api.post(`/terms/${id}/view`);
    return response.data;
};

export const getTrendingTerms = async () => {
    const response = await api.get('/terms/trending/now');
    return response.data;
};

export const getMaps = async (gameId: string) => {
    const response = await api.get(`/maps/${gameId}`);
    return response.data;
};

export const getUserProfile = async () => {
    const response = await api.get('/users/me');
    return response.data;
};

export const getUserActivity = async () => {
    const response = await api.get('/users/me/activity');
    return response.data;
};

export const updateUserProfile = async (data: any) => {
    const response = await api.put('/users/me', data);
    return response.data;
};


export const updatePassword = async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/users/me/password', { currentPassword, newPassword });
    return response.data;
};
export const forgotPassword = async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
};

export const searchTerms = async (query: string) => {
    const response = await api.get(`/terms/search?q=${encodeURIComponent(query)}`);
    return response.data;
};

// AI Services (server-side Gemini proxy)
export const generateTermDefinition = async (term: string) => {
    const response = await api.post('/ai/generate-definition', { term });
    return response.data;
};

export const validateContribution = async (word: string, definition: string) => {
    const response = await api.post('/ai/validate-contribution', { word, definition });
    return response.data;
};
