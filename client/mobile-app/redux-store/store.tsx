import { configureStore } from '@reduxjs/toolkit'
import { authSlice } from './features/auth';

const store = configureStore({
    reducer: {
        [authSlice.reducerPath]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(authSlice.middleware),
});

export default store;