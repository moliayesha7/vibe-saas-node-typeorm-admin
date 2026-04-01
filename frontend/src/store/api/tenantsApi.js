import { baseApi } from './baseApi';

export const tenantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTenants: builder.query({
      query: (params = {}) => ({ url: '/tenants', params }),
      providesTags: ['Tenant'],
      transformResponse: (res) => res,
    }),
    getTenantById: builder.query({
      query: (id) => `/tenants/${id}`,
      providesTags: (_, __, id) => [{ type: 'Tenant', id }],
      transformResponse: (res) => res.data,
    }),
    createTenant: builder.mutation({
      query: (data) => ({ url: '/tenants', method: 'POST', body: data }),
      invalidatesTags: ['Tenant'],
    }),
    updateTenant: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/tenants/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_, __, { id }) => ['Tenant', { type: 'Tenant', id }],
    }),
    deleteTenant: builder.mutation({
      query: (id) => ({ url: `/tenants/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tenant'],
    }),
  }),
});

export const {
  useGetTenantsQuery, useGetTenantByIdQuery, useCreateTenantMutation,
  useUpdateTenantMutation, useDeleteTenantMutation,
} = tenantsApi;
