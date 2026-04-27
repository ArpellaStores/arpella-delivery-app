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
  const url = typeof args === "string" ? args : args.url;
  const method = typeof args === "string" ? "GET" : args.method || "GET";
  const body = typeof args === "string" ? null : args.body;

  const state = queryApi.getState();
  const token = state.auth?.user?.token || state.auth?.user?.Token || state.auth?.token;

  const isPublicAuthEndpoint = url?.includes("login") || url?.includes("otp") || url?.includes("register") || url?.includes("reset-password");

  if (!token && !isPublicAuthEndpoint) {
    console.warn("[API] No token found for private endpoint. Forcing logout and redirect.");
    queryApi.dispatch(logout());
    if (router && router.replace) {
      router.replace('/Login');
    }
    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: 'Missing authentication token.',
        data: { message: 'Authentication required' }
      }
    };
  }

  const result = await baseQuery(args, queryApi, extraOptions);

  if (result.error) {
    console.error(`\n[API ERROR] ${method} ${url}`, JSON.stringify(result.error, null, 2));
  }

  if (result?.error?.status === 401 && !url?.includes("login")) {
    queryApi.dispatch(logout());
    if (router && router.replace) {
      router.replace('/Login');
    }
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
