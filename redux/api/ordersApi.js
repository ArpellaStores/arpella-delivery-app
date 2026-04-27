import { api } from "./index";

export const ordersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query({
      query: (username) => `/orders/${username}?platform=mobile`,
      providesTags: ["Orders"],
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (response?.items && Array.isArray(response.items)) return response.items;
        if (response?.data && Array.isArray(response.data)) return response.data;
        if (response?.content && Array.isArray(response.content)) return response.content;
        return [];
      },
    }),
  }),
  overrideExisting: true,
});

export const { useGetOrdersQuery, useLazyGetOrdersQuery } = ordersApi;
