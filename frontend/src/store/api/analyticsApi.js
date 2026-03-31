import { baseApi } from './baseApi';

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query({
      query: () => '/analytics/dashboard',
      providesTags: ['Analytics'],
      transformResponse: (res) => res.data,
    }),
    getSalesTrend: builder.query({
      query: (params = {}) => ({ url: '/analytics/sales-trend', params }),
      providesTags: ['Analytics'],
      transformResponse: (res) => res.data,
    }),
    getUserActivity: builder.query({
      query: (params = {}) => ({ url: '/analytics/user-activity', params }),
      providesTags: ['Analytics'],
      transformResponse: (res) => res.data,
    }),
    getPaymentDistribution: builder.query({
      query: () => '/analytics/payment-distribution',
      providesTags: ['Analytics'],
      transformResponse: (res) => res.data,
    }),
    getTopMetrics: builder.query({
      query: () => '/analytics/top-metrics',
      providesTags: ['Analytics'],
      transformResponse: (res) => res.data,
    }),
    exportAnalytics: builder.query({
      query: (params) => ({ url: '/analytics/export', params }),
    }),
  }),
});

export const {
  useGetDashboardStatsQuery, useGetSalesTrendQuery, useGetUserActivityQuery,
  useGetPaymentDistributionQuery, useGetTopMetricsQuery, useLazyExportAnalyticsQuery,
} = analyticsApi;
