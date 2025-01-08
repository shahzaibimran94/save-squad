import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const authApi = createApi({
    reducerPath: 'api/auth',
    baseQuery: fetchBaseQuery({ baseUrl: process.env.EXPO_PUBLIC_API_URL }),
    endpoints: (builder) => ({
      login: builder.mutation({
        query: (credentials) => ({
          url: '/auth/login',
          method: 'POST',
          body: credentials,
        }),
      }),
      signup: builder.mutation({
        query: (userData) => ({
          url: '/auth/register',
          method: 'POST',
          body: userData,
        }),
      }),
    }),
});

export const { useLoginMutation, useSignupMutation } = authApi;