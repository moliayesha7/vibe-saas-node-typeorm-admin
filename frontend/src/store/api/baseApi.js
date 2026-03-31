import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../utils/constants';
import { logout } from '../slices/authSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken || localStorage.getItem('accessToken');
    const tenantId = getState().auth.user?.tenantId || localStorage.getItem('tenantId');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (tenantId) headers.set('X-Tenant-ID', tenantId);
    return headers;
  },
});

// Auto-logout on 401
const baseQueryWithAuth = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    api.dispatch(logout());
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['User', 'Tenant', 'Payment', 'Analytics', 'File', 'Notification'],
  endpoints: () => ({}),
});
