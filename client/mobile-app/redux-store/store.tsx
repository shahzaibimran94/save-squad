import { configureStore } from '@reduxjs/toolkit'
import { authApi } from './features/auth';
import authReducer from './features/auth/slice';

const store = configureStore({
    reducer: {
        [authApi.reducerPath]: authApi.reducer,
        auth: authReducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(authApi.middleware),
});

export default store;