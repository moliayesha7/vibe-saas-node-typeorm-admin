import { baseApi } from './baseApi';
import { setCredentials, logout } from '../slices/authSlice';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({ url: '/auth/login', method: 'POST', body: credentials }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials(data.data));
      },
    }),
    register: builder.mutation({
      query: (data) => ({ url: '/auth/register', method: 'POST', body: data }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials(data.data));
      },
    }),
    logout: builder.mutation({
      // Send stored refreshToken so the server can revoke it
      query: () => {
        const refreshToken = localStorage.getItem('refreshToken');
        return { url: '/auth/logout', method: 'POST', body: { refreshToken } };
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        // Clear local state regardless of server response
        await queryFulfilled.catch(() => {});
        dispatch(logout());
        dispatch(baseApi.util.resetApiState());
      },
    }),
    getMe: builder.query({
      query: () => '/auth/me',
      providesTags: ['User'],
      transformResponse: (res) => res.data,
    }),
    forgotPassword: builder.mutation({
      query: (data) => ({ url: '/auth/forgot-password', method: 'POST', body: data }),
    }),
    resetPassword: builder.mutation({
      query: (data) => ({ url: '/auth/reset-password', method: 'POST', body: data }),
    }),
    changePassword: builder.mutation({
      query: (data) => ({ url: '/auth/change-password', method: 'POST', body: data }),
    }),
  }),
});

export const {
  useLoginMutation, useRegisterMutation, useLogoutMutation,
  useGetMeQuery, useForgotPasswordMutation, useResetPasswordMutation,
  useChangePasswordMutation,
} = authApi;
