import {
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { logout } from "../slices/authSlice";
import { router } from "expo-router";

const API_URL = "https://api2.arpellastore.com";

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const state = getState();
    const token = state.auth?.user?.token || state.auth?.user?.Token || state.auth?.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
  timeout: 15000,
});

const baseQueryWithLogout = async (args, queryApi, extraOptions) => {
  const url = typeof args === 'string' ? args : args.url;
  const method = typeof args === 'string' ? 'GET' : args.method || 'GET';

  const state = queryApi.getState();
  const token =
    state.auth?.user?.token ||
    state.auth?.user?.Token ||
    state.auth?.token;

  const isPublicAuthEndpoint =
    url?.includes('login') ||
    url?.includes('otp') ||
    url?.includes('register') ||
    url?.includes('reset-password');

  console.log(
    `[API] ${method} ${url} | token: ${token ? token.slice(0, 20) + '…' : 'NONE'} | public: ${isPublicAuthEndpoint}`
  );

  if (!token && !isPublicAuthEndpoint) {
    console.warn('[API] No token — dispatching logout and redirecting to Login');
    queryApi.dispatch(logout());
    if (router?.replace) router.replace('/Login');
    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: 'Missing authentication token.',
        data: { message: 'Authentication required' },
      },
    };
  }

  const result = await baseQuery(args, queryApi, extraOptions);

  if (result.error) {
    console.error(
      `[API ERROR] ${method} ${url}\nStatus: ${result.error.status}\nData: ${JSON.stringify(result.error.data ?? result.error.error, null, 2)}`
    );
  } else {
    console.log(`[API OK] ${method} ${url} → status ${result.meta?.response?.status ?? 'ok'}`);
  }

  if (result?.error?.status === 401 && !url?.includes('login')) {
    console.warn('[API] 401 received — dispatching logout');
    queryApi.dispatch(logout());
    if (router?.replace) router.replace('/Login');
  }

  return result;
};

export const api = createApi({
  baseQuery: baseQueryWithLogout,
  endpoints: () => ({}),
  tagTypes: ["Products", "Categories", "Orders", "Inventories"],
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  keepUnusedDataFor: 0,
});
