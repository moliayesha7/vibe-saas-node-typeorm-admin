import { baseApi } from './baseApi';

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayments: builder.query({
      query: (params = {}) => ({ url: '/payments', params }),
      providesTags: ['Payment'],
      transformResponse: (res) => res,
    }),
    getPaymentStats: builder.query({
      query: () => '/payments/stats',
      providesTags: ['Payment'],
      transformResponse: (res) => res.data,
    }),
    createPayment: builder.mutation({
      query: (data) => ({ url: '/payments', method: 'POST', body: data }),
      invalidatesTags: ['Payment'],
    }),
    refundPayment: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/payments/${id}/refund`, method: 'POST', body: data }),
      invalidatesTags: ['Payment'],
    }),
  }),
});

export const {
  useGetPaymentsQuery, useGetPaymentStatsQuery, useCreatePaymentMutation, useRefundPaymentMutation,
} = paymentsApi;
