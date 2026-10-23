import { createSlice } from '@reduxjs/toolkit';

export interface SuperAdminInfo {
  _id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  internalId?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  policies?: string;
}

interface SuperAdminInitialState {
  superAdminInfo: { userData: SuperAdminInfo } | null;
}

const superAdminInfoFromLocalStorage = localStorage.getItem("superAdminInfo");

const initialState: SuperAdminInitialState = {
  superAdminInfo: superAdminInfoFromLocalStorage ? JSON.parse(superAdminInfoFromLocalStorage) : null,
};

const superAdminSlice = createSlice({
  name: 'superAdminAuth',
  initialState,
  reducers: {
    setSuperAdminCredentials: (state, action) => {
      state.superAdminInfo = action.payload;
      localStorage.setItem("superAdminInfo", JSON.stringify(action.payload));
    },
    superAdminLogOut: (state) => {
      state.superAdminInfo = null;
      localStorage.removeItem("superAdminInfo");
    },
  },
});

export const {
  setSuperAdminCredentials,
  superAdminLogOut,
} = superAdminSlice.actions;

export default superAdminSlice.reducer;

