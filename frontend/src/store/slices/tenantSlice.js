import { createSlice } from '@reduxjs/toolkit';

const tenantSlice = createSlice({
  name: 'tenant',
  initialState: {
    currentTenant: null,
    tenants: [],
  },
  reducers: {
    setCurrentTenant: (state, action) => {
      state.currentTenant = action.payload;
    },
    setTenants: (state, action) => {
      state.tenants = action.payload;
    },
  },
});

export const { setCurrentTenant, setTenants } = tenantSlice.actions;
export const selectCurrentTenant = (state) => state.tenant.currentTenant;
export default tenantSlice.reducer;
