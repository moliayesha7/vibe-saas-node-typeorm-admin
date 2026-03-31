import { baseApi } from './baseApi';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: (params = {}) => ({ url: '/users', params }),
      providesTags: ['User'],
      transformResponse: (res) => res,
    }),
    getUserById: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (_, __, id) => [{ type: 'User', id }],
      transformResponse: (res) => res.data,
    }),
    createUser: builder.mutation({
      query: (data) => ({ url: '/users', method: 'POST', body: data }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/users/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_, __, { id }) => ['User', { type: 'User', id }],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({ url: '/users/profile', method: 'PUT', body: data }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetUsersQuery, useGetUserByIdQuery, useCreateUserMutation,
  useUpdateUserMutation, useDeleteUserMutation, useUpdateProfileMutation,
} = usersApi;
